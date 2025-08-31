# Система очередей для RNode Server 🚀

## Обзор

Интеграция мощной системы очередей задач в RNode Server для обработки фоновых операций, асинхронных задач и распределенной обработки с поддержкой Redis, in-memory и файловых очередей.

## Цели

- ✅ Реализовать многоуровневую систему очередей
- ✅ Поддержать Redis, in-memory и файловые очереди
- ✅ Интегрировать с существующей системой middleware
- ✅ Обеспечить отказоустойчивость и повторные попытки
- ✅ Добавить планировщик задач и cron-задачи

## Архитектура

### Многоуровневая система очередей
```
Application Layer
       ↓
   Queue Manager
       ↓
┌─────────────┬─────────────┬─────────────┐
│ In-Memory   │   Redis     │   File      │
│   Queue     │   Queue     │   Queue     │
│  (Fast)     │ (Persistent)| (Backup)    │
└─────────────┴─────────────┴─────────────┘
       ↓
   Job Processor
       ↓
   Worker Pool
```

### Интеграция с существующей архитектурой
```
Client → Rust Backend → Node.js → JavaScript Handlers
                           ↓
                    Queue Middleware
                           ↓
                    Queue Manager
                           ↓
                    Job Processors
```

## Техническая реализация

### 1. Rust Backend (Queue Manager)

#### Зависимости в Cargo.toml
```toml
[dependencies]
redis = { version = "0.23", features = ["tokio-comp", "connection-manager"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full", "cron"] }
dashmap = "5.5"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.0", features = ["v4"] }
futures = "0.3"
tokio-cron-scheduler = "0.9"
```

#### Структуры данных
```rust
// crates/rnode-server/src/queue/mod.rs
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use dashmap::DashMap;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub id: Uuid,
    pub queue: String,
    pub data: serde_json::Value,
    pub handler_id: String, // JavaScript handler ID
    pub priority: JobPriority,
    pub attempts: u32,
    pub max_attempts: u32,
    pub delay: Option<u64>, // задержка в секундах
    pub created_at: DateTime<Utc>,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub failed_at: Option<DateTime<Utc>>,
    pub error: Option<String>,
    pub tags: Vec<String>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum JobPriority {
    Low = 0,
    Normal = 5,
    High = 10,
    Critical = 15,
}

#[derive(Debug, Clone)]
pub struct QueueConfig {
    pub name: String,
    pub concurrency: u32,
    pub retry_delay: u64,
    pub max_retries: u32,
    pub timeout: u64,
    pub backoff_strategy: BackoffStrategy,
}

#[derive(Debug, Clone)]
pub enum BackoffStrategy {
    Fixed(u64),
    Exponential { base: u64, max: u64 },
    Custom(Vec<u64>),
}

#[derive(Debug)]
pub struct QueueManager {
    queues: Arc<DashMap<String, QueueConfig>>,
    in_memory_queues: Arc<DashMap<String, InMemoryQueue>>,
    redis_client: Option<redis::Client>,
    scheduler: Arc<tokio_cron_scheduler::JobScheduler>,
    stats: Arc<RwLock<QueueStats>>,
}

#[derive(Debug, Default)]
pub struct QueueStats {
    pub jobs_processed: u64,
    pub jobs_failed: u64,
    pub jobs_retried: u64,
    pub active_workers: u32,
    pub queue_sizes: HashMap<String, usize>,
}
```

#### In-Memory очередь
```rust
// crates/rnode-server/src/queue/memory.rs
use std::collections::BinaryHeap;
use tokio::sync::mpsc;

pub struct InMemoryQueue {
    name: String,
    jobs: Arc<RwLock<BinaryHeap<Job>>>,
    config: QueueConfig,
    workers: Vec<Worker>,
    stats: Arc<RwLock<QueueStats>>,
}

impl InMemoryQueue {
    pub async fn push(&self, job: Job) -> Result<(), String> {
        let mut jobs = self.jobs.write().await;
        jobs.push(job);
        
        // Уведомляем свободных воркеров
        self.notify_workers().await;
        Ok(())
    }
    
    pub async fn pop(&self) -> Option<Job> {
        let mut jobs = self.jobs.write().await;
        jobs.pop()
    }
    
    pub async fn size(&self) -> usize {
        self.jobs.read().await.len()
    }
    
    async fn notify_workers(&self) {
        // Логика уведомления воркеров
    }
}

pub struct Worker {
    id: u32,
    queue_name: String,
    job_sender: mpsc::Sender<Job>,
    job_receiver: mpsc::Receiver<Job>,
}

impl Worker {
    pub async fn start(&mut self) {
        while let Some(job) = self.job_receiver.recv().await {
            self.process_job(job).await;
        }
    }
    
    async fn process_job(&self, job: Job) {
        // Обработка задачи
        let start_time = Utc::now();
        
        // Вызов JavaScript handler
        match self.call_javascript_handler(&job).await {
            Ok(_) => {
                // Успешное выполнение
                self.mark_job_completed(&job).await;
            }
            Err(error) => {
                // Обработка ошибки
                self.handle_job_error(&job, &error).await;
            }
        }
    }
}
```

#### Redis очередь
```rust
// crates/rnode-server/src/queue/redis.rs
use redis::{Client, Connection, Commands, RedisResult};
use tokio::sync::Mutex;

pub struct RedisQueue {
    client: Client,
    connection: Arc<Mutex<Connection>>,
    name: String,
    config: QueueConfig,
}

impl RedisQueue {
    pub async fn push(&self, job: &Job) -> RedisResult<()> {
        let mut conn = self.connection.lock().await;
        let job_data = serde_json::to_string(job)?;
        
        // Добавляем задачу в очередь
        let queue_key = format!("queue:{}", self.name);
        let job_key = format!("job:{}", job.id);
        
        // Сохраняем данные задачи
        conn.set_ex(&job_key, &job_data, 86400)?; // 24 часа
        
        // Добавляем в очередь с приоритетом
        let score = self.calculate_score(job);
        conn.zadd(&queue_key, &job_key, score)?;
        
        Ok(())
    }
    
    pub async fn pop(&self) -> RedisResult<Option<Job>> {
        let mut conn = self.connection.lock().await;
        let queue_key = format!("queue:{}", self.name);
        
        // Получаем задачу с наивысшим приоритетом
        let result: Option<(String, f64)> = conn.zpopmax(&queue_key, 1)?.pop();
        
        if let Some((job_key, _)) = result {
            // Получаем данные задачи
            let job_data: Option<String> = conn.get(&job_key)?;
            
            if let Some(data) = job_data {
                let job: Job = serde_json::from_str(&data)?;
                
                // Удаляем задачу из очереди
                conn.zrem(&queue_key, &job_key)?;
                
                Ok(Some(job))
            } else {
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }
    
    fn calculate_score(&self, job: &Job) -> f64 {
        let priority_score = job.priority as f64 * 1000.0;
        let time_score = job.created_at.timestamp() as f64;
        
        priority_score + time_score
    }
}
```

### 2. JavaScript API

#### Основные интерфейсы
```typescript
// src/types/queue.d.ts
export interface JobData {
  [key: string]: any;
}

export interface JobOptions {
  priority?: 'low' | 'normal' | 'high' | 'critical';
  delay?: number; // задержка в секундах
  attempts?: number; // максимальное количество попыток
  timeout?: number; // таймаут в секундах
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface Job<T = any> {
  id: string;
  queue: string;
  data: T;
  priority: string;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  createdAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  tags: string[];
  metadata: Record<string, string>;
}

export interface QueueConfig {
  name: string;
  concurrency?: number;
  retryDelay?: number;
  maxRetries?: number;
  timeout?: number;
  backoffStrategy?: 'fixed' | 'exponential' | 'custom';
  customDelays?: number[];
}

export interface QueueStats {
  jobsProcessed: number;
  jobsFailed: number;
  jobsRetried: number;
  activeWorkers: number;
  queueSizes: Record<string, number>;
}

export interface QueueManager {
  // Управление очередями
  createQueue(config: QueueConfig): Promise<void>;
  deleteQueue(name: string): Promise<void>;
  getQueue(name: string): Queue;
  
  // Добавление задач
  push<T>(queueName: string, data: T, options?: JobOptions): Promise<string>;
  pushBatch<T>(queueName: string, jobs: Array<{ data: T; options?: JobOptions }>): Promise<string[]>;
  
  // Планировщик задач
  schedule<T>(queueName: string, data: T, cron: string, options?: JobOptions): Promise<string>;
  scheduleAt<T>(queueName: string, data: T, date: Date, options?: JobOptions): Promise<string>;
  
  // Мониторинг
  getStats(): Promise<QueueStats>;
  getJob(jobId: string): Promise<Job | null>;
  getJobs(queueName: string, status?: string, limit?: number): Promise<Job[]>;
  
  // Управление
  pauseQueue(name: string): Promise<void>;
  resumeQueue(name: string): Promise<void>;
  clearQueue(name: string): Promise<void>;
}

export interface Queue {
  name: string;
  
  // Обработчики
  process<T>(handler: (job: Job<T>) => Promise<void>): void;
  processConcurrent<T>(handler: (job: Job<T>) => Promise<void>, concurrency: number): void;
  
  // Управление
  pause(): Promise<void>;
  resume(): Promise<void>;
  clear(): Promise<void>;
  
  // Статистика
  getStats(): Promise<{
    size: number;
    processing: number;
    completed: number;
    failed: number;
  }>;
}
```

#### Интеграция с App
```typescript
// src/utils/app.ts
export class RNodeApp {
  // ... существующий код ...
  
  queue(config?: QueueConfig): QueueManager {
    return this.addon.getQueueManager(config);
  }
  
  // Middleware для добавления задач в очередь
  queueMiddleware(queueName: string, options?: JobOptions): Middleware {
    return async (req, res, next) => {
      const queue = this.queue();
      
      // Перехват ответа для добавления задач в очередь
      const originalSend = res.json;
      res.json = function(data: any) {
        // Добавляем задачу в очередь на основе ответа
        if (data && data.queueJob) {
          queue.push(queueName, data.queueJob, options).catch(console.error);
        }
        return originalSend.call(this, data);
      };
      
      next();
    };
  }
}
```

### 3. Примеры использования

#### Базовая очередь
```typescript
import { createApp } from 'rnode-server';

const app = createApp();
const queue = app.queue();

// Создание очереди
await queue.createQueue({
  name: 'emails',
  concurrency: 5,
  retryDelay: 60,
  maxRetries: 3
});

// Обработчик задач
const emailQueue = queue.getQueue('emails');
emailQueue.process(async (job) => {
  const { to, subject, body } = job.data;
  
  try {
    await sendEmail(to, subject, body);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error; // Задача будет повторена
  }
});

// Добавление задачи
app.post('/api/send-email', async (req, res) => {
  const { to, subject, body } = req.body;
  
  const jobId = await queue.push('emails', {
    to,
    subject,
    body
  }, {
    priority: 'high',
    tags: ['email', 'notification']
  });
  
  res.json({ jobId, status: 'queued' });
});
```

#### Очередь с приоритетами
```typescript
// Создание очереди с высоким приоритетом
await queue.createQueue({
  name: 'urgent-tasks',
  concurrency: 2,
  retryDelay: 30,
  maxRetries: 5
});

const urgentQueue = queue.getQueue('urgent-tasks');
urgentQueue.process(async (job) => {
  const { task, data } = job.data;
  
  switch (task) {
    case 'payment':
      await processPayment(data);
      break;
    case 'notification':
      await sendUrgentNotification(data);
      break;
    default:
      throw new Error(`Unknown urgent task: ${task}`);
  }
});

// Добавление срочных задач
app.post('/api/urgent-task', async (req, res) => {
  const { task, data } = req.body;
  
  const jobId = await queue.push('urgent-tasks', { task, data }, {
    priority: 'critical',
    timeout: 300, // 5 минут
    tags: ['urgent', task]
  });
  
  res.json({ jobId, priority: 'critical' });
});
```

#### Планировщик задач
```typescript
// Ежедневная задача в 2:00 утра
await queue.schedule('maintenance', {
  type: 'daily-cleanup',
  tables: ['logs', 'temp_data', 'cache']
}, '0 2 * * *', {
  tags: ['maintenance', 'daily']
});

// Задача через час
await queue.scheduleAt('reminders', {
  type: 'follow-up',
  userId: 123,
  message: 'Don\'t forget to complete your profile'
}, new Date(Date.now() + 60 * 60 * 1000), {
  priority: 'normal',
  tags: ['reminder', 'follow-up']
});

// Обработчик плановых задач
const maintenanceQueue = queue.getQueue('maintenance');
maintenanceQueue.process(async (job) => {
  const { type, tables } = job.data;
  
  switch (type) {
    case 'daily-cleanup':
      await performDailyCleanup(tables);
      break;
    case 'weekly-report':
      await generateWeeklyReport();
      break;
    default:
      console.log(`Unknown maintenance task: ${type}`);
  }
});
```

#### Batch обработка
```typescript
// Массовая отправка уведомлений
app.post('/api/bulk-notifications', async (req, res) => {
  const { users, message } = req.body;
  
  const jobs = users.map(user => ({
    data: {
      userId: user.id,
      email: user.email,
      message
    },
    options: {
      priority: 'normal',
      tags: ['notification', 'bulk']
    }
  }));
  
  const jobIds = await queue.pushBatch('notifications', jobs);
  
  res.json({ 
    message: `Queued ${jobIds.length} notifications`,
    jobIds 
  });
});

// Обработчик с ограниченной конкурентностью
const notificationQueue = queue.getQueue('notifications');
notificationQueue.processConcurrent(async (job) => {
  const { userId, email, message } = job.data;
  
  await sendNotification(email, message);
  await updateUserNotificationStatus(userId, 'sent');
}, 10); // максимум 10 одновременных отправок
```

#### Очередь с retry стратегией
```typescript
// Создание очереди с экспоненциальной задержкой
await queue.createQueue({
  name: 'external-api',
  concurrency: 3,
  retryDelay: 60,
  maxRetries: 5,
  backoffStrategy: 'exponential'
});

const apiQueue = queue.getQueue('external-api');
apiQueue.process(async (job) => {
  const { endpoint, data } = job.data;
  
  try {
    const response = await callExternalAPI(endpoint, data);
    
    if (response.status === 'rate_limited') {
      // Повтор через 5 минут
      throw new Error('Rate limited');
    }
    
    await saveResponse(response);
  } catch (error) {
    if (error.message === 'Rate limited') {
      // Специальная обработка для rate limiting
      throw error;
    }
    
    // Другие ошибки
    console.error(`API call failed:`, error);
    throw error;
  }
});
```

## План разработки

### Этап 1: Базовая инфраструктура (1-2 недели)
- [ ] Добавить зависимости очередей в Cargo.toml
- [ ] Создать базовые структуры данных Job и Queue
- [ ] Реализовать In-Memory очередь
- [ ] Создать Queue Manager

### Этап 2: Redis интеграция (1 неделя)
- [ ] Реализовать Redis очередь
- [ ] Добавить поддержку приоритетов
- [ ] Реализовать retry механизм
- [ ] Добавить обработку ошибок

### Этап 3: JavaScript API (1 неделя)
- [ ] Создать TypeScript интерфейсы
- [ ] Реализовать методы в RNodeApp
- [ ] Добавить Queue Manager методы
- [ ] Реализовать обработчики задач

### Этап 4: Расширенная функциональность (1-2 недели)
- [ ] Планировщик задач (cron)
- [ ] Batch операции
- [ ] Мониторинг и статистика
- [ ] Middleware интеграция

### Этап 5: Тестирование и документация (1 неделя)
- [ ] Написать unit тесты
- [ ] Создать интеграционные тесты
- [ ] Написать примеры использования
- [ ] Обновить документацию

## Тестирование

### Unit тесты
```typescript
// tests/queue.test.ts
import { createApp } from 'rnode-server';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Queue System', () => {
  let app: any;
  let queue: any;
  
  beforeAll(async () => {
    app = createApp();
    queue = app.queue();
    
    await queue.createQueue({
      name: 'test-queue',
      concurrency: 2
    });
  });
  
  afterAll(async () => {
    await queue.clearQueue('test-queue');
  });
  
  it('should process jobs in queue', async () => {
    let processed = false;
    
    const testQueue = queue.getQueue('test-queue');
    testQueue.process(async (job) => {
      processed = true;
      expect(job.data.message).toBe('test');
    });
    
    await queue.push('test-queue', { message: 'test' });
    
    // Ждем обработки
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(processed).toBe(true);
  });
});
```

### Load тесты
```typescript
// tests/queue-load.test.ts
import { createApp } from 'rnode-server';

describe('Queue Load Testing', () => {
  it('should handle high job volume', async () => {
    // Тест производительности при высокой нагрузке
  });
  
  it('should handle concurrent processing', async () => {
    // Тест конкурентной обработки
  });
});
```

## Производительность

### Цели
- **In-Memory**: 100,000+ задач в секунду
- **Redis**: 50,000+ задач в секунду
- **Задержка**: < 10ms для добавления задач
- **Память**: Эффективное использование с автоматической очисткой

### Оптимизации
- Использование DashMap для конкурентного доступа
- Пул соединений Redis
- Асинхронная обработка задач
- Эффективные алгоритмы планирования

## Безопасность

### Меры защиты
- Валидация данных задач
- Ограничение размера задач
- Защита от DoS атак
- Изоляция данных между очередями

## Мониторинг

### Метрики
- `queue_jobs_total` - общее количество задач
- `queue_jobs_processed_total` - обработанные задачи
- `queue_jobs_failed_total` - неудачные задачи
- `queue_processing_duration_seconds` - время обработки

### Grafana дашборд
- Количество задач в очередях
- Время обработки
- Статистика ошибок
- Активность воркеров

## Конфигурация

### Environment variables
```bash
# Redis
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=rnode:queue
QUEUE_DEFAULT_TTL=86400

# Очереди
QUEUE_DEFAULT_CONCURRENCY=5
QUEUE_DEFAULT_RETRIES=3
QUEUE_DEFAULT_TIMEOUT=300
```

### Конфигурация приложения
```typescript
const app = createApp({
  queue: {
    redis: {
      url: process.env.REDIS_URL,
      prefix: process.env.REDIS_PREFIX,
      ttl: parseInt(process.env.QUEUE_DEFAULT_TTL)
    },
    default: {
      concurrency: parseInt(process.env.QUEUE_DEFAULT_CONCURRENCY),
      retries: parseInt(process.env.QUEUE_DEFAULT_RETRIES),
      timeout: parseInt(process.env.QUEUE_DEFAULT_TIMEOUT)
    }
  }
});
```

## Заключение

Система очередей для RNode Server обеспечит:
- **Высокую производительность** для асинхронных задач
- **Надежность** с поддержкой retry и отказоустойчивости
- **Гибкость** с поддержкой приоритетов и планирования
- **Масштабируемость** для высоконагруженных приложений
- **Интеграцию** с существующей архитектурой

Это позволит RNode Server стать полноценной платформой для современных веб-приложений, требующих надежной обработки фоновых задач и асинхронных операций.
