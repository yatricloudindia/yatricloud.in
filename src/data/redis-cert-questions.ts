/**
 * Redis Certified Developer Practice Exam Questions
 * Imported from redis_cert_questions.html (65 comprehensive questions)
 */

export interface ExamQuestion {
  id: string;
  questionNumber: number;
  domain: string;
  title: string;
  leadInText?: string;
  codeSnippet?: string;
  chooseCount: number;
  options: { letter: string; text: string }[];
  correctAnswers: string[];
  explanation: string;
}

export interface ExamDumpData {
  slug: string;
  title: string;
  provider: string;
  examCode: string;
  totalQuestions: number;
  passingScorePercent: number;
  timeLimitMinutes: number;
  domains: string[];
  questions: ExamQuestion[];
}

export const REDIS_DEVELOPER_EXAM: ExamDumpData = {
  slug: "redis-certified-developer",
  title: "Redis Certified Developer",
  provider: "Redis",
  examCode: "REDIS-DEV",
  totalQuestions: 65,
  passingScorePercent: 72,
  timeLimitMinutes: 90,
  domains: [
    "Fundamentals & Core Engine",
    "Data Structures & JSON",
    "Caching, Eviction & TTL",
    "Persistence, Pipelines & Transactions",
    "Sets, Sorted Sets & Streams",
    "Production Scenarios & Architecture"
  ],
  questions: [
  {
    "id": "redis-q-1",
    "questionNumber": 1,
    "domain": "Fundamentals & Core Engine",
    "title": "Which of the following are accurate statements about Redis?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 2,
    "options": [
      {
        "letter": "A",
        "text": "When Redis reaches its configured memory limit, it rejects all incoming commands, including reads, until memory is freed by expiring keys or by an administrator manually deleting data."
      },
      {
        "letter": "B",
        "text": "Redis uses multiple threads to execute commands in parallel, which is how a single instance can handle hundreds of thousands of operations per second."
      },
      {
        "letter": "C",
        "text": "Redis stores data primarily in main memory (RAM), which is why it achieves lower latency than disk-based databases for read and write operations."
      },
      {
        "letter": "D",
        "text": "Redis supports configurable persistence mechanisms that allow data to survive process restarts when enabled."
      },
      {
        "letter": "E",
        "text": "Redis data structures like Hashes and Sorted Sets are client-side abstractions, the client library converts them into plain Strings before sending them to the server, which stores everything in a single flat key-value format."
      }
    ],
    "correctAnswers": [
      "C",
      "D"
    ],
    "explanation": "The correct answer is C, D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-2",
    "questionNumber": 2,
    "domain": "Fundamentals & Core Engine",
    "title": "You're inspecting the raw traffic between the client and server on an application using Redis. Which of the following are true about RESP (Redis Serialization Protocol)?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 2,
    "options": [
      {
        "letter": "A",
        "text": "RESP traffic cannot be inspected with standard networking tools. Because the protocol uses a compact encoding, you need a specialized Redis protocol analyzer to read or send raw commands to the server."
      },
      {
        "letter": "B",
        "text": "RESP responses are type-prefixed, the first byte of each response indicates its wire type, such as + for simple strings, - for errors, and : for integers. This allows parsers to determine how to read each response from the byte stream."
      },
      {
        "letter": "C",
        "text": "RESP encrypts all traffic between the client and server by default, so no additional TLS configuration is needed to secure Redis connections in production."
      },
      {
        "letter": "D",
        "text": "Each Redis client library uses its own proprietary wire format to communicate with the server, and RESP is only used internally within the server to serialize data to disk."
      },
      {
        "letter": "E",
        "text": "Clients send commands to the Redis server as RESP arrays of bulk strings. For example, SET mykey myvalue is transmitted as an array of three bulk strings: SET, mykey, and myvalue."
      }
    ],
    "correctAnswers": [
      "B",
      "E"
    ],
    "explanation": "The correct answer is B, E. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-3",
    "questionNumber": 3,
    "domain": "Fundamentals & Core Engine",
    "title": "Which statement most accurately describes Redis transactions?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Redis transactions block all other clients as soon as MULTI is issued, and no other commands on the server can run until EXEC or DISCARD."
      },
      {
        "letter": "B",
        "text": "Redis transactions queue commands until EXEC, then execute them sequentially without interleaving from other clients, but Redis does not support rollback."
      },
      {
        "letter": "C",
        "text": "Redis transactions provide SQL-style rollback, so if any command fails during execution, all earlier commands in the transaction are automatically undone."
      },
      {
        "letter": "D",
        "text": "Redis transactions execute each command immediately when it is issued after MULTI, and EXEC only asks Redis to return the buffered results."
      }
    ],
    "correctAnswers": [
      "B"
    ],
    "explanation": "The correct answer is B. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-4",
    "questionNumber": 4,
    "domain": "Fundamentals & Core Engine",
    "title": "Which of the following is NOT an example of an atomic operation in Redis?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Appending to a list"
      },
      {
        "letter": "B",
        "text": "Deleting a key using UNLINK"
      },
      {
        "letter": "C",
        "text": "Incrementing a numeric counter"
      },
      {
        "letter": "D",
        "text": "Executing a series of commands in a pipeline"
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-5",
    "questionNumber": 5,
    "domain": "Fundamentals & Core Engine",
    "title": "Which of the following are valid Redis key names under Redis's default key-size limit?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 4,
    "options": [
      {
        "letter": "A",
        "text": "The \"winking face\" emoji"
      },
      {
        "letter": "B",
        "text": "\"\" (an empty string)"
      },
      {
        "letter": "C",
        "text": "The raw bytes of a PDF file, approximately 120 KB in size"
      },
      {
        "letter": "D",
        "text": "The raw bytes of a compressed dump of Wikipedia, approximately 1 GB in size"
      },
      {
        "letter": "E",
        "text": "A key made of the letter \"a\" repeated until the key is 512 MB long"
      }
    ],
    "correctAnswers": [
      "A",
      "B",
      "C",
      "E"
    ],
    "explanation": "The correct answer is A, B, C, E. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-6",
    "questionNumber": 6,
    "domain": "Fundamentals & Core Engine",
    "title": "You're setting up a Python service that caches product data in Redis. You write the following:",
    "leadInText": "What does <code>print(name)</code> output, and why?",
    "codeSnippet": "import redis\n\nr = redis.Redis(host='localhost', port=6379)\nr.set('product:42:name', 'Widget Pro')\nname = r.get('product:42:name')\nprint(name)",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "('Widget Pro', None), because get() returns both the value and metadata about the key."
      },
      {
        "letter": "B",
        "text": "'Widget Pro', because redis.Redis() automatically decodes Redis string values into Python str objects by default."
      },
      {
        "letter": "C",
        "text": "b'Widget Pro', because redis-py returns responses as bytes unless decode_responses=True is set."
      },
      {
        "letter": "D",
        "text": "None, because Redis writes are asynchronous and the value may not be available immediately after set()."
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-7",
    "questionNumber": 7,
    "domain": "Fundamentals & Core Engine",
    "title": "Your Python application uses a custom connection pool with a low limit:",
    "leadInText": "During a traffic spike, 20 concurrent threads each try to issue Redis commands through the shared <code>r</code> client. What happens?",
    "codeSnippet": "import redis\n\npool = redis.ConnectionPool(\n    host='localhost', port=6379,\n    max_connections=5,\n    decode_responses=True\n)\n\nr = redis.Redis(connection_pool=pool)",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "The 6th through 20th threads raise a ConnectionError because all 5 connections are in use and the pool refuses to create more. The application must either increase max_connections or use a BlockingConnectionPool to have threads wait instead of failing."
      },
      {
        "letter": "B",
        "text": "The pool creates 20 connections immediately, ignoring the max_connections setting, because ConnectionPool treats max_connections as a soft limit that only affects idle connection cleanup, not active connection creation."
      },
      {
        "letter": "C",
        "text": "redis-py automatically increases max_connections beyond 5 when demand exceeds the configured limit, scaling up to match the number of active threads and scaling back down when traffic subsides."
      },
      {
        "letter": "D",
        "text": "All 20 threads share the 5 connections transparently through redis-py's built-in multiplexing layer. Each connection handles multiple concurrent commands by interleaving requests and responses on the same socket."
      }
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-8",
    "questionNumber": 8,
    "domain": "Fundamentals & Core Engine",
    "title": "Your application uses Redis database 0 for caching and Redis database 1 for background-job state. A developer suggests using one shared redis-py client and issuing <code>SELECT 0</code> or <code>SELECT 1</code> before each operation depending on the data being accessed. Which approach is correct?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Reuse one client and one pool for both databases, because the selected database is stored on the client object rather than on each connection."
      },
      {
        "letter": "B",
        "text": "Reuse one client and issue SELECT before each command, because redis-py resets the selected database whenever a pooled connection is returned."
      },
      {
        "letter": "C",
        "text": "Create separate Redis clients for each database, because redis-py does not implement SELECT on client instances when pooled connections are involved."
      },
      {
        "letter": "D",
        "text": "Switch the client to RESP3, because the protocol version determines whether pooled connections can safely move between Redis databases."
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-9",
    "questionNumber": 9,
    "domain": "Fundamentals & Core Engine",
    "title": "Your service uses <code>redis.asyncio.Redis()</code> and keeps a single client for the lifetime of the application. When the service is shutting down, what should it do to clean up the client correctly?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "It should close only the connection pool, because the asyncio Redis client itself does not provide a client-level shutdown method."
      },
      {
        "letter": "B",
        "text": "It should call client.close() without awaiting it, because close() is a synchronous shutdown method and only pool cleanup is asynchronous."
      },
      {
        "letter": "C",
        "text": "It should call await client.aclose(), because asyncio Redis requires an explicit disconnect and the default internal connection pool is closed with the client."
      },
      {
        "letter": "D",
        "text": "It should do nothing, because the event loop automatically closes any Redis client and connection pool objects when the process exits."
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-10",
    "questionNumber": 10,
    "domain": "Fundamentals & Core Engine",
    "title": "Your Python service uses a custom <code>ConnectionPool</code> with a low <code>max_connections</code> setting. Under load, once all connections are in use, new callers begin failing immediately with <code>ConnectionError</code>. The team wants those callers to wait for a connection instead of failing right away. What should they change?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "They should switch the client to RESP3, because protocol version controls whether redis-py blocks or raises when all pooled connections are busy."
      },
      {
        "letter": "B",
        "text": "They should enable decode_responses=True, because response decoding changes the pool from fail-fast behavior to wait-for-availability behavior."
      },
      {
        "letter": "C",
        "text": "They should use BlockingConnectionPool, because the default ConnectionPool raises at the limit while BlockingConnectionPool waits for a connection to become available."
      },
      {
        "letter": "D",
        "text": "They should increase socket_timeout, because a larger network timeout causes callers to wait longer for an available pooled connection."
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-11",
    "questionNumber": 11,
    "domain": "Data Structures & JSON",
    "title": "Your team is deciding how to cache product records. One developer proposes storing each product as a serialized JSON string like <code>{\"name\":\"Widget\",\"price\":9.99,\"stock\":150}</code>. Another proposes using a Hash.",
    "leadInText": "The application frequently updates stock counts without touching other fields. What is the strongest argument for choosing a Hash over a serialized String in this case?",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Hashes use less memory than Strings for all data sizes."
      },
      {
        "letter": "B",
        "text": "A Hash allows updating the stock field directly without deserializing and rewriting the entire record."
      },
      {
        "letter": "C",
        "text": "A Hash automatically coerces numeric fields, so stock can be incremented without type conversion."
      },
      {
        "letter": "D",
        "text": "Hashes enforce type constraints on field values, so storing stock as a number prevents accidental non-numeric assignments, unlike a serialized String, which stores the entire record as untyped text."
      }
    ],
    "correctAnswers": [
      "B"
    ],
    "explanation": "The correct answer is B. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-12",
    "questionNumber": 12,
    "domain": "Data Structures & JSON",
    "title": "You wrote the code below to cache a product for the first time, then immediately update its stock. What are the values of <code>result1</code> and <code>result2</code>?",
    "leadInText": "",
    "codeSnippet": "result1 = r.hset('product:42', mapping={\n    'name': 'Widget',\n    'price': '9.99',\n    'category': 'gadgets',\n    'stock': '150'\n})\n\nresult2 = r.hset('product:42', 'stock', '125')",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "result1 = 1, result2 = 0"
      },
      {
        "letter": "B",
        "text": "result1 = 4, result2 = 1"
      },
      {
        "letter": "C",
        "text": "result1 = 4, result2 = 0"
      },
      {
        "letter": "D",
        "text": "result1 = True, result2 = True"
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-13",
    "questionNumber": 13,
    "domain": "Data Structures & JSON",
    "title": "After a flash sale ends, a cleanup routine removes the discount field from all product Hashes using HDEL. For one product, discount was the only field in the Hash. A developer on your team assumes the key still exists afterward and schedules a separate UNLINK job to remove it later. What actually happens?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Redis keeps the key as a zero-length Hash until the next background cleanup cycle removes it, so the scheduled UNLINK job is still needed to reclaim memory."
      },
      {
        "letter": "B",
        "text": "Redis automatically deletes the key when its last field is removed. There is no such thing as an empty Hash in Redis. The scheduled UNLINK job is unnecessary."
      },
      {
        "letter": "C",
        "text": "The key persists as an empty Hash until explicitly deleted with DEL. HDEL only removes fields, not the key itself."
      },
      {
        "letter": "D",
        "text": "HDEL on the last remaining field returns an error, signaling that DEL must be used instead to remove the final field."
      }
    ],
    "correctAnswers": [
      "B"
    ],
    "explanation": "The correct answer is B. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-14",
    "questionNumber": 14,
    "domain": "Data Structures & JSON",
    "title": "You're building a product page that displays only the item's name and price. The product is cached as a Hash with six fields: <code>name</code>, <code>price</code>, <code>category</code>, <code>stock</code>, <code>weight</code>, and <code>supplier</code>. Which call fetches exactly the fields you need in a single round trip, without retrieving unnecessary data?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "client.hgetall('product:42')"
      },
      {
        "letter": "B",
        "text": "client.mget('product:42:name', 'product:42:price')"
      },
      {
        "letter": "C",
        "text": "client.hmget('product:42', ['name', 'price'])"
      },
      {
        "letter": "D",
        "text": "client.hscan('product:42', 0, match='name|price')"
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-15",
    "questionNumber": 15,
    "domain": "Data Structures & JSON",
    "title": "A supplier import job refreshes <code>name</code>, <code>price</code>, and <code>stock</code> on every run, but the <code>firstSeenAt</code> field in each product Hash should be written only the first time the product appears. Multiple workers may process the same product simultaneously. Which approach is best?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Use HSETNX product:42 firstSeenAt <timestamp> for that field, and use HSET for mutable fields like name, price, and stock."
      },
      {
        "letter": "B",
        "text": "Run HEXISTS product:42 firstSeenAt, then call HSET product:42 firstSeenAt <timestamp> if the field is missing, because Redis serializes commands so the check-and-set cannot race."
      },
      {
        "letter": "C",
        "text": "Use HSET product:42 firstSeenAt <timestamp>, because HSET refuses to overwrite existing fields."
      },
      {
        "letter": "D",
        "text": "Store firstSeenAt in a separate key with SETNX, because Hash fields cannot be conditionally set."
      }
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-16",
    "questionNumber": 16,
    "domain": "Data Structures & JSON",
    "title": "Your team has been caching flat product records as Hashes. A new requirement arrives: each product now includes a nested dimensions object with <code>width</code>, <code>height</code>, and <code>weight</code> fields, as well as an array of <code>tags</code>. A team member suggests migrating from Hashes to JSON. What is the strongest reason to consider this change for this data model?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "JSON compresses documents internally, so nested structures use significantly less memory than equivalent Hash representations."
      },
      {
        "letter": "B",
        "text": "JSON automatically indexes all paths for searching, eliminating the need for key naming conventions."
      },
      {
        "letter": "C",
        "text": "JSON supports TTL on individual paths within a document, allowing dimensions to expire separately from the rest of the product."
      },
      {
        "letter": "D",
        "text": "JSON allows you to read and update nested paths like $.dimensions.weight directly, whereas a Hash would require you to flatten the structure size into a single field."
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-17",
    "questionNumber": 17,
    "domain": "Data Structures & JSON",
    "title": "You store a product as a Redis JSON document with nested fields and an array of tags. Which statement best explains why the application must handle RedisJSON path results carefully?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "RedisJSON automatically flattens nested objects, so paths like $.dimensions.weight are rewritten as dimensions.weight."
      },
      {
        "letter": "B",
        "text": "JSON.GET can only read top-level fields unless the document was indexed first."
      },
      {
        "letter": "C",
        "text": "JSON.GET always returns plain strings, so the application must parse every number manually."
      },
      {
        "letter": "D",
        "text": "Paths using $ can return arrays of matches, even when the path currently matches one value."
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-18",
    "questionNumber": 18,
    "domain": "Data Structures & JSON",
    "title": "A supplier notifies you that the weight for product 42 has changed. The product document includes a nested dimensions object with width, height, and weight fields. You need to update only the weight without rewriting the rest of the document. Which call accomplishes this?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "r.json().set('product:42', '$', {'dimensions': {'weight': 0.6}})"
      },
      {
        "letter": "B",
        "text": "r.json().set('product:42', '$.weight', 0.6)"
      },
      {
        "letter": "C",
        "text": "r.json().set('product:42', '$.dimensions', 0.6)"
      },
      {
        "letter": "D",
        "text": "r.json().set('product:42', '$.dimensions.weight', 0.6)"
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-19",
    "questionNumber": 19,
    "domain": "Data Structures & JSON",
    "title": "Your team is running a seasonal promotion where certain product tags need to be removed when the sale ends. You review the following cleanup code:",
    "leadInText": "The product had <code>tags: ['gadget', 'sale']</code>. After this runs, you retrieve the full product. What happened?",
    "codeSnippet": "product = r.json().get('product:42', '$')\nremoved = r.json().delete('product:42', '$.tags')\nprint(removed)\n\nproduct = r.json().get('product:42', '$')",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "The tags field was removed from the document entirely, the product still exists but no longer has a tags property."
      },
      {
        "letter": "B",
        "text": "The contents of tags were emptied to [], but the field itself remains on the document."
      },
      {
        "letter": "C",
        "text": "The entire product:42 key was deleted because removing tags left an incomplete document."
      },
      {
        "letter": "D",
        "text": "The command failed silently because JSON.DEL cannot remove root-level fields, only nested paths."
      }
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-20",
    "questionNumber": 20,
    "domain": "Data Structures & JSON",
    "title": "After running both Hashes and JSON documents in production for several weeks, your team is establishing guidelines for when to use each. Which of the following is a valid guideline?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Use JSON for read-heavy workloads and Hashes for write-heavy workloads, since Hashes are always faster for write operations."
      },
      {
        "letter": "B",
        "text": "Use Hashes only when the record has fewer than 10 fields, since Hashes become less memory-efficient than JSON beyond that threshold."
      },
      {
        "letter": "C",
        "text": "Use JSON for data that requires TTL and Hashes for data that should persist indefinitely, since Hashes do not support key expiration."
      },
      {
        "letter": "D",
        "text": "Use JSON when the data has nested structures or arrays that need to be queried or updated by path; use Hashes when the data is a flat set of field-value pairs with no nesting."
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-21",
    "questionNumber": 21,
    "domain": "Caching, Eviction & TTL",
    "title": "Your team is implementing cache-aside for product lookups. A request comes in for a product that is not currently in Redis. Which sequence of steps correctly describes the cache-aside pattern for handling this cache miss?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Redis automatically queries the database when a key is missing, caches the result, and returns it to the application."
      },
      {
        "letter": "B",
        "text": "The application reads from Redis and gets a miss, queries the database, writes the result to Redis, and returns it to the caller."
      },
      {
        "letter": "C",
        "text": "The application writes the product to Redis, then reads it back from Redis, then returns it to the caller."
      },
      {
        "letter": "D",
        "text": "The application queries the database, returns the result to the caller, and Redis asynchronously fetches and caches the record in the background."
      }
    ],
    "correctAnswers": [
      "B"
    ],
    "explanation": "The correct answer is B. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-22",
    "questionNumber": 22,
    "domain": "Caching, Eviction & TTL",
    "title": "When a product's price is updated in the database, the cached copy in Redis becomes stale. You're reviewing two approaches your team proposed. Which approach is more consistent with the cache-aside pattern, and why?",
    "leadInText": "",
    "codeSnippet": "# Approach A:\ndef update_price(r, product_id, new_price):\n    db.update_product_price(product_id, new_price)\n    r.hset(f'product:{product_id}', 'price', new_price)\n\n# Approach B:\ndef update_price(r, product_id, new_price):\n    db.update_product_price(product_id, new_price)\n    r.delete(f'product:{product_id}')",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Approach A, because updating the cache directly avoids a subsequent cache miss and keeps the cache warm at all times. This reduces latency for the next read and ensures users always see the latest price immediately."
      },
      {
        "letter": "B",
        "text": "Neither. Cache-aside requires the database to notify Redis directly when data changes through an event-driven push, so the application should not be involved in invalidation."
      },
      {
        "letter": "C",
        "text": "Approach A, because deleting the key in Approach B creates a window where the product is completely unavailable to users until another request triggers the cache-aside path and repopulates it."
      },
      {
        "letter": "D",
        "text": "Approach B, because cache-aside treats the database as the source of truth. Deleting the key forces the next read to repopulate from the database, avoiding write-path inconsistency."
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-23",
    "questionNumber": 23,
    "domain": "Caching, Eviction & TTL",
    "title": "Your team is configuring Redis with <code>maxmemory</code> for a cache-aside layer. Some cached keys have TTLs and some do not. Which statement correctly describes how <code>allkeys-lru</code>, <code>volatile-lru</code>, and <code>noeviction</code> differ when Redis runs out of memory?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "allkeys-lru can evict any key based on recent use, volatile-lru can evict only keys that have an expiration set, and noeviction rejects writes that would exceed the memory limit."
      },
      {
        "letter": "B",
        "text": "allkeys-lru evicts the least recently used keys only among keys that have an expiration set, volatile-lru also evicts only among keys that have an expiration set, and noeviction rejects writes once memory is exhausted."
      },
      {
        "letter": "C",
        "text": "allkeys-lru and volatile-lru both evict from the full keyspace, but volatile-lru gives priority to keys with shorter TTLs. noeviction keeps accepting writes by spilling them to disk."
      },
      {
        "letter": "D",
        "text": "allkeys-lru evicts the largest key first, volatile-lru evicts the least recently used expiring keys, and noeviction disables expiration so keys stay until deleted."
      }
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-24",
    "questionNumber": 24,
    "domain": "Caching, Eviction & TTL",
    "title": "Your Redis instance is configured with <code>maxmemory</code> and the <code>allkeys-lru</code> eviction policy. During a traffic spike, Redis starts evicting cached product keys to stay within the memory limit. How does this affect your cache-aside implementation?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "The application will begin throwing errors because it attempts to read keys that were evicted mid-request."
      },
      {
        "letter": "B",
        "text": "The application continues to function correctly, evicted keys appear as cache misses, and the cache-aside logic repopulates them from the database on the next read."
      },
      {
        "letter": "C",
        "text": "Evicted keys are moved to a secondary storage tier by Redis and are still accessible, but with higher latency."
      },
      {
        "letter": "D",
        "text": "The application must be updated to listen for eviction events and preemptively repopulate the cache, otherwise users will see empty product records."
      }
    ],
    "correctAnswers": [
      "B"
    ],
    "explanation": "The correct answer is B. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-25",
    "questionNumber": 25,
    "domain": "Caching, Eviction & TTL",
    "title": "You're load testing your cache-aside implementation and notice that immediately after a product update, some requests return stale data. Here's the relevant code:",
    "leadInText": "What is causing the stale data?",
    "codeSnippet": "def update_price(r, product_id, new_price):\n    r.delete(f'product:{product_id}')\n    db.update_product_price(product_id, new_price)\n\ndef get_product(r, product_id):\n    cached = r.hgetall(f'product:{product_id}')\n    if not cached:\n        product = db.fetch_product(product_id)\n        if product:\n            r.hset(f'product:{product_id}', mapping=product)\n            return product\n    return cached",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "r.delete and db.update_product_price execute on different threads, so the database update may complete before the Redis delete due to Python's GIL releasing during I/O operations."
      },
      {
        "letter": "B",
        "text": "hgetall maintains an internal result cache within the redis-py client object, so even after the key is deleted from Redis, the client returns the previously retrieved value."
      },
      {
        "letter": "C",
        "text": "hset silently fails when called immediately after delete on the same key, leaving the cache permanently empty."
      },
      {
        "letter": "D",
        "text": "The cache is deleted \"before\" the database is updated, a concurrent get_product call between the delete and the database write will read the old price from the database and re-cache it."
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-26",
    "questionNumber": 26,
    "domain": "Caching, Eviction & TTL",
    "title": "Your team has been caching individual product records as Hashes. Now the product listing page, which returns filtered results like \"all gadgets under $20 sorted by price,\" is generating a heavy database load. You need to cache these full result sets. Why is a String more appropriate than a Hash for caching a query result?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "A String is more appropriate because a query result is a pre-computed response with no need to read or update individual fields, so serializing it into a single value is simpler than mapping it to Hash fields."
      },
      {
        "letter": "B",
        "text": "A String is more appropriate because Hashes are intended for single-record caching, while Strings are the standard choice for caching any response that contains multiple records."
      },
      {
        "letter": "C",
        "text": "A Hash is actually the better choice because each product in the result set maps naturally to a Hash field, and HGETALL retrieves them all at once as one complete response."
      },
      {
        "letter": "D",
        "text": "A Hash is required whenever a cached value contains multiple products, because Redis Strings can only store a single scalar value and cannot hold serialized arrays or nested objects."
      }
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-27",
    "questionNumber": 27,
    "domain": "Caching, Eviction & TTL",
    "title": "Your team caches many listing-page query results with a 5-minute TTL (<code>EX: 300</code>). Product managers report that price changes can leave some listing pages stale for up to 5 minutes. A teammate proposes lowering the TTL to 15 seconds. What is the main tradeoff across the query cache?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Shorter TTLs will cause cache stampedes for most queries, because every expired entry forces multiple requests to hit the database at the same time."
      },
      {
        "letter": "B",
        "text": "The application will need to handle more cache invalidation events, because shorter TTLs trigger more expiration notifications that the client must process and respond to."
      },
      {
        "letter": "C",
        "text": "The cache hit rate will drop. More query results will expire before reuse, causing more reads to fall through to the database."
      },
      {
        "letter": "D",
        "text": "A 15-second TTL will cause Redis to consume more CPU on expiration processing, which will degrade the latency of all other Redis commands running on the same instance."
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-28",
    "questionNumber": 28,
    "domain": "Caching, Eviction & TTL",
    "title": "You're implementing query caching for the product listing page. Your team has agreed on the key schema <code>query:{category}:{sort}:{page}</code>. You need to write a function that checks the cache first, falls through to the database on a miss, caches the result, and returns it. Which implementation is correct?",
    "leadInText": "A.",
    "codeSnippet": "import json\n\ndef get_products(r, category, sort, page):\n    key = f'query:{category}:{sort}:{page}'\n    cached = r.get(key)\n    if cached:\n        return json.loads(cached)\n    results = db.query_products(category, sort, page)\n    r.set(key, results, ex=300)\n    return results",
    "chooseCount": 1,
    "options": [],
    "correctAnswers": [
      "B"
    ],
    "explanation": "The correct answer is B. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-29",
    "questionNumber": 29,
    "domain": "Caching, Eviction & TTL",
    "title": "During a flash sale, one listing query is requested hundreds of times per second. The cached result can be up to 60 seconds stale, but the team wants to avoid a database spike when the normal TTL is reached while keeping response latency low. Which query-caching strategy best fits this situation?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Extend the fixed TTL to several hours during the sale so the key is unlikely to expire while traffic is high."
      },
      {
        "letter": "B",
        "text": "Use a miss-time Redis lock. When the key expires, one request rebuilds while the remaining requests wait until the fresh value is written."
      },
      {
        "letter": "C",
        "text": "Apply TTL jitter to query cache keys so many listing results are less likely to expire at the same time."
      },
      {
        "letter": "D",
        "text": "Use stale-while-revalidate with soft and hard TTLs. Serve the cached result briefly while one worker refreshes it."
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-30",
    "questionNumber": 30,
    "domain": "Caching, Eviction & TTL",
    "title": "Your team is investigating two patterns of unexpected key removal in Redis. In the first, a product key is consistently gone after the same amount of time regardless of how frequently it is accessed. In the second, product keys disappear only during high write volume, Redis memory usage is at its configured limit, and the server's eviction counter increases. What is the most likely explanation for each scenario?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Both are TTL-based expiration. The second scenario occurs because Redis uses lazy expiration, deferring deletion of expired keys until they are accessed, so keys appear to vanish unpredictably at that time."
      },
      {
        "letter": "B",
        "text": "The first is TTL-based expiration. The second is caused by memory-based eviction, but only keys that already have a TTL set are at risk. Redis never evicts persistent keys when memory is exhausted."
      },
      {
        "letter": "C",
        "text": "The first is TTL-based expiration. Redis removed the key after its time-to-live elapsed, regardless of access patterns. The second is memory-based eviction. Redis hit its maxmemory limit and began removing keys as required."
      },
      {
        "letter": "D",
        "text": "The first is memory-based eviction using volatile-ttl, which removes the key closest to its expiration deadline. The second is TTL-based expiration where short, randomized TTLs are causing keys to expire unpredictably under load."
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-31",
    "questionNumber": 31,
    "domain": "Caching, Eviction & TTL",
    "title": "You're debugging a caching issue and need to check when a specific product key is set to expire. You run <code>EXPIRETIME product:42</code> in the Redis CLI. Under which conditions would this command return <code>-1</code>?",
    "leadInText": "",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "The key product:42 does not exist in the database at all."
      },
      {
        "letter": "B",
        "text": "The key product:42 has an expiration set, but it has less than 1 second remaining before it expires."
      },
      {
        "letter": "C",
        "text": "The key product:42 was created with SETNX and has EXPIRETIME not compatible with keys created using conditional set operations."
      },
      {
        "letter": "D",
        "text": "The key product:42 exists but has no expiration set, it will persist until explicitly deleted or evicted."
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-32",
    "questionNumber": 32,
    "domain": "Caching, Eviction & TTL",
    "title": "Your team cached products with a 5-minute TTL using <code>r.set(key, data, ex=300)</code>. Later, a new feature was added that updates the cached stock whenever inventory changes:",
    "leadInText": "After deploying this feature, the ops team notices that some product keys are never expiring. What is the root cause?",
    "codeSnippet": "import json\n\ndef update_cached_stock(r, product_id, new_stock):\n    product = r.get(f'product:{product_id}')\n    if product:\n        parsed = json.loads(product)\n        parsed['stock'] = new_stock\n        r.set(f'product:{product_id}', json.dumps(parsed))",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "The set command in the update function overwrites the key without specifying a TTL, so Redis discards the existing expiration. The key now persists indefinitely until manually deleted or evicted."
      },
      {
        "letter": "B",
        "text": "Calling r.get on a key resets its TTL to infinite, because Redis treats any read as a signal that the key is still in active use."
      },
      {
        "letter": "C",
        "text": "The if product: check prevents the function from running when the key doesn't exist, but it also prevents the function from restoring the TTL on keys that have already expired and been recreated by another process."
      },
      {
        "letter": "D",
        "text": "json.loads and json.dumps corrupt the TTL metadata embedded in the serialized value, so Redis can no longer determine when the key should expire."
      }
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-33",
    "questionNumber": 33,
    "domain": "Caching, Eviction & TTL",
    "title": "You have a product cached as a Hash with a 5-minute TTL:",
    "leadInText": "What happens to the TTL on <code>product:42</code> after the update call?",
    "codeSnippet": "r.hset('product:42', mapping={'name': 'Widget', 'price': '9.99', 'stock': '150'})\nr.expire('product:42', 300)\n\n# Later:\nr.hset('product:42', 'stock', '125')",
    "chooseCount": 1,
    "options": [],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-34",
    "questionNumber": 34,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "Redis Persistence Strategy",
    "leadInText": "Your team is evaluating persistence for a Redis product cache that uses cache-aside in front of a relational database. Redis is not the source of truth, and losing the most recent few minutes of cached entries after a restart is acceptable. The main goal is to avoid a complete cache miss after restart while keeping normal cache writes lightweight and restart loading fast. Which persistence strategy best fits this priority?",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Enable AOF with appendfsync everysec so Redis replays recent cache writes and prioritizes lower data loss."
      },
      {
        "letter": "B",
        "text": "Enable AOF with appendfsync always so each cache write is synced immediately, prioritizing the lowest possible data loss."
      },
      {
        "letter": "C",
        "text": "Enable RDB snapshots at regular intervals so Redis can restart from a recent point-in-time cache state."
      },
      {
        "letter": "D",
        "text": "Disable persistence entirely and require the application to pre-fetch the full product catalog before accepting traffic."
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-35",
    "questionNumber": 35,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "Pipeline vs. Transaction",
    "leadInText": "When a customer views a product page, your application needs to perform three Redis operations: fetch the cached product data, increment the page view counter, and check if the product is in the user's wishlist. None of these operations depend on each other's results. In redis-py, which approach is more appropriate and why?",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "A non-transactional pipeline is more appropriate because the three operations are independent and do not require atomicity. In redis-py, pipeline(transaction=False) batches them for efficiency without wrapping them in MULTI/EXEC."
      },
      {
        "letter": "B",
        "text": "A transaction is more appropriate because it ensures all three operations execute without interleaving from other clients, which prevents data corruption when multiple users view the same page."
      },
      {
        "letter": "C",
        "text": "A transaction is more appropriate because pipelines can only batch write operations. Since one of the three operations is a read, a pipeline would fail and a transaction is required."
      },
      {
        "letter": "D",
        "text": "Neither is appropriate because redis-py pipelines are transactional by default, so batching without transaction semantics is not possible and the commands must be issued separately."
      }
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-36",
    "questionNumber": 36,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "Pipeline Results",
    "leadInText": "When a customer adds a product to their cart, your application needs to atomically decrement the stock count and add the product to the customer's cart Set. You review the following implementation:",
    "codeSnippet": "def add_to_cart(r, product_id, customer_id):\n    pipe = r.pipeline()\n    pipe.hincrby(f'product:{product_id}', 'stock', -1)\n    pipe.sadd(f'cart:{customer_id}', product_id)\n    results = pipe.execute()\n\nprint(results)",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "[{'stock': 9}, {'added': True}]"
      },
      {
        "letter": "B",
        "text": "[9, 1]"
      },
      {
        "letter": "C",
        "text": "[(-1, 'stock'), (1, 'cart')]"
      },
      {
        "letter": "D",
        "text": "['OK', 'OK']"
      }
    ],
    "correctAnswers": [
      "B"
    ],
    "explanation": "The correct answer is B. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-37",
    "questionNumber": 37,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "Last-Item Purchase Race Condition",
    "leadInText": "Your team implements a last-item purchase check using a read-then-write pattern:",
    "codeSnippet": "def add_to_cart(r, product_id, customer_id):\n    stock = r.get(f'product:{product_id}', 'stock')\n    if int(stock) > 0:\n        r.hset(f'product:{product_id}', 'stock', str(int(stock) - 1))\n        r.sadd(f'cart:{customer_id}', product_id)\n    else:\n        raise Exception('Out of stock')",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "hget returns a cached value from the client library, so both requests see 1 after the first write. The fix is to disable client-side caching on the read so each request sees the latest server value."
      },
      {
        "letter": "B",
        "text": "The client may reorder sadd ahead of hset for throughput. The fix is to wrap both commands in MULTI/EXEC without WATCH, which guarantees only one request can complete successfully."
      },
      {
        "letter": "C",
        "text": "Both requests read stock = 1 before either writes. Each decrements it to 0, so both pass the check. The fix is to use one atomic server-side decrement such as HINCRBY -1, then reject or compensate if the result is negative."
      },
      {
        "letter": "D",
        "text": "int() introduces a timing delay between the read and write. The fix is to compare stock as a string instead of converting it to an integer before the conditional check."
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-38",
    "questionNumber": 38,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "Redis INFO <code>expires</code>",
    "leadInText": "A Redis <code>INFO keyspace</code> report includes this line:",
    "codeSnippet": "db0:keys=25,expires=11,avg_ttl=285000",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "11 keys were evicted because Redis ran out of memory."
      },
      {
        "letter": "B",
        "text": "11 keys have an expiration set."
      },
      {
        "letter": "C",
        "text": "11 keys have already expired but have not been deleted yet."
      },
      {
        "letter": "D",
        "text": "11 keys are permanent and will not expire."
      }
    ],
    "correctAnswers": [
      "B"
    ],
    "explanation": "The correct answer is B. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-39",
    "questionNumber": 39,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "SCAN",
    "leadInText": "A production Redis database has millions of keys. Your team needs to find keys matching <code>product:*</code> without blocking Redis. Which statement about this command is correct?",
    "codeSnippet": "SCAN 0 MATCH product:* COUNT 1000",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "It returns exactly 1000 matching keys unless fewer than 1000 exist."
      },
      {
        "letter": "B",
        "text": "It returns all matching keys in one call because the cursor starts at 0."
      },
      {
        "letter": "C",
        "text": "It is one step in a cursor scan. The caller must continue until the cursor returns to 0."
      },
      {
        "letter": "D",
        "text": "It is equivalent to KEYS product:*, but safer because it only checks keys with the product: prefix."
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-40",
    "questionNumber": 40,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "TTL Returns <code>-1</code>",
    "leadInText": "You run:",
    "codeSnippet": "TTL product:45",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "The key exists but has no expiration set."
      },
      {
        "letter": "B",
        "text": "The key does not exist."
      },
      {
        "letter": "C",
        "text": "The key has less than one second before it expires."
      },
      {
        "letter": "D",
        "text": "Redis could not determine the key's TTL."
      }
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-41",
    "questionNumber": 41,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "EXISTS with Duplicate Keys",
    "leadInText": "An app verifies a generated list of cache keys by running <code>EXISTS</code> and comparing the integer result to the list length. The generated list can contain duplicate key names. What is the main risk with this approach?",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Redis removes duplicate names before counting, so the check can fail even when all required keys exist."
      },
      {
        "letter": "B",
        "text": "With multiple arguments, EXISTS returns only 0 or 1, so comparing it to the list length is invalid."
      },
      {
        "letter": "C",
        "text": "Redis treats duplicate key arguments as a syntax error and returns no count."
      },
      {
        "letter": "D",
        "text": "A repeated existing key can be counted more than once, so the check can pass even when a distinct required key is missing."
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-42",
    "questionNumber": 42,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "MEMORY USAGE",
    "leadInText": "A large product catalog is stored as a Redis Hash with many fields. A reviewer wants an exact RAM measurement for the full aggregate value, including Redis overhead. Which statement about <code>MEMORY USAGE product:catalog</code> is correct?",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "It reports memory in bytes, but aggregate values may use sampling unless SAMPLES 0 is specified."
      },
      {
        "letter": "B",
        "text": "It reports only field values and excludes Redis object overhead."
      },
      {
        "letter": "C",
        "text": "It reports the RDB serialized payload size, so it should match DUMP product:catalog."
      },
      {
        "letter": "D",
        "text": "It reports nil for Hashes because memory usage can only be measured for Strings."
      }
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-43",
    "questionNumber": 43,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "Redis Key Naming",
    "leadInText": "Your team is designing the key namespace for the food delivery platform. Which key naming approach provides the best organization for debugging and operational monitoring?",
    "codeSnippet": "rest:5:menu\nrest:5:orders:recent\ndishes:trending\ncustomers:unique:2025-03-25",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Prefix every key with the application and environment, but vary the remaining segment order by feature."
      },
      {
        "letter": "B",
        "text": "Use a consistent hierarchical namespace with colon separators that starts with the data type."
      },
      {
        "letter": "C",
        "text": "Use a consistent hierarchical namespace with colon separators, but use human-readable restaurant names as the primary segment."
      },
      {
        "letter": "D",
        "text": "Use a consistent hierarchical namespace with colon separators, entity first:"
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-44",
    "questionNumber": 44,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "Redis List for a Recent Orders Feed",
    "leadInText": "Your team is implementing the recent orders feed using a Redis List: <code>LPUSH</code> on each completed order, <code>LTRIM</code> to cap at 50, and <code>LRANGE 0 49</code> to retrieve. A teammate argues you should switch to a Sorted Set because it would make the ordering explicit by storing each order's completion timestamp as the score. Which of the following are valid reasons to keep the List?",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Lists generally use less memory than Sorted Sets for simple feeds, so memory efficiency should be the main reason to prefer them here."
      },
      {
        "letter": "B",
        "text": "Orders arrive in the correct order naturally, so no scoring mechanism is needed to maintain the feed's sequence."
      },
      {
        "letter": "C",
        "text": "A Sorted Set would require the application to guarantee that no two orders share the same timestamp, since duplicate scores corrupt the feed's ordering."
      },
      {
        "letter": "D",
        "text": "The feed does not require ranking, range queries by score, or weighted ordering, so none of the extra capabilities a Sorted Set adds are needed here."
      },
      {
        "letter": "E",
        "text": "LPUSH and LTRIM together provide a simple and natural pattern for maintaining a capped recent-orders feed."
      }
    ],
    "correctAnswers": [
      "B",
      "D",
      "E"
    ],
    "explanation": "The correct answer is B, D, E. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-45",
    "questionNumber": 45,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "LTRIM",
    "leadInText": "You're reviewing the implementation for adding a completed order to a restaurant's recent orders feed. What does the <code>r.ltrim(key, 0, 49)</code> call accomplish?",
    "codeSnippet": "import json\n\ndef add_completed_order(r, restaurant_id, order_data):\n    key = f'orders:recent:{restaurant_id}'\n    r.lpush(key, json.dumps(order_data))\n    r.ltrim(key, 0, 49)",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "It sets a maximum capacity of 49 on the list. Any future LPUSH calls will silently fail once the list reaches this capacity."
      },
      {
        "letter": "B",
        "text": "It removes elements at indices 0 through 49, clearing the first 50 entries and leaving only orders older than the 50th most recent."
      },
      {
        "letter": "C",
        "text": "It removes the first 49 elements from the list, keeping only elements from index 50 onward."
      },
      {
        "letter": "D",
        "text": "It keeps elements at indices 0 through 49 (the 50 most recent orders) and removes everything beyond that, so the list never grows past 50 elements."
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-46",
    "questionNumber": 46,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "Missing Redis List Key",
    "leadInText": "Your team's dashboard component fetches the recent orders feed for display. A new restaurant was just onboarded and hasn't received any orders yet. What does this function return when called for that restaurant?",
    "codeSnippet": "import json\n\ndef get_recent_orders(r, restaurant_id):\n    key = f'orders:recent:{restaurant_id}'\n    orders = r.lrange(key, 0, -1)\n    return [json.loads(o) for o in orders]",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "It throws a redis.exceptions.ResponseError because the key doesn't exist yet."
      },
      {
        "letter": "B",
        "text": "It returns None because LRANGE returns None for keys that don't exist, and the list comprehension will throw a TypeError."
      },
      {
        "letter": "C",
        "text": "It raises a KeyError because redis-py treats a missing key the same as a missing dictionary key in Python."
      },
      {
        "letter": "D",
        "text": "It returns an empty list [] because LRANGE returns an empty list when the key doesn't exist, and a list comprehension over an empty list produces another empty list."
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-47",
    "questionNumber": 47,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "LPUSH Order",
    "leadInText": "Three orders complete in quick succession for a restaurant. Your application runs:",
    "codeSnippet": "import json\n\nr.lpush('orders:recent:5', json.dumps({'id': 'A', 'item': 'Pizza'}))\nr.lpush('orders:recent:5', json.dumps({'id': 'B', 'item': 'Burger'}))\nr.lpush('orders:recent:5', json.dumps({'id': 'C', 'item': 'Sushi'}))\n\nfeed = r.lrange('orders:recent:5', 0, 2)",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "[A-Pizza, B-Burger, C-Sushi]"
      },
      {
        "letter": "B",
        "text": "[C-Sushi, B-Burger]"
      },
      {
        "letter": "C",
        "text": "[A-Pizza]"
      },
      {
        "letter": "D",
        "text": "[C-Sushi, B-Burger, A-Pizza]"
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-48",
    "questionNumber": 48,
    "domain": "Persistence, Pipelines & Transactions",
    "title": "Concurrent LPUSH/LTRIM",
    "leadInText": "After deploying the recent orders feed, the ops team notices that restaurant dashboards occasionally show 51 or 52 orders instead of 50. You review the code:",
    "codeSnippet": "import json\n\ndef add_completed_order(r, restaurant_id, order_data):\n    key = f'orders:recent:{restaurant_id}'\n    length = r.lpush(key, json.dumps(order_data))\n    if length > 50:\n        r.ltrim(key, 0, 49)",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Two concurrent requests can both LPUSH before either LTRIM runs, creating a window where the list temporarily exceeds 50 entries and a dashboard read during that window sees the oversized list."
      },
      {
        "letter": "B",
        "text": "LPUSH returns the list length before the insertion, so the length > 50 check is off by one and the trim never fires at the right time."
      },
      {
        "letter": "C",
        "text": "LTRIM is asynchronous and does not completely trim the list before finishes on the server."
      },
      {
        "letter": "D",
        "text": "LTRIM removes one element per call, so a single trim only brings a list of 51 down to 50, but if two pushes arrive before the trim runs, the second push is never trimmed."
      }
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-49",
    "questionNumber": 49,
    "domain": "Sets, Sorted Sets & Streams",
    "title": "Redis Set for Unique Customers",
    "leadInText": "Your team is tracking unique customers who ordered from each restaurant on a given day. Each time an order completes, the customer ID is added via <code>SADD</code>. The daily unique count is retrieved via <code>SCARD</code>. Which of the following are good reasons a Redis Set fits this use case?",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Sets automatically expire individual members after a configurable TTL, so yesterday's customers are removed without manual cleanup."
      },
      {
        "letter": "B",
        "text": "Duplicate customer IDs are stored only once, and SCARD can return the Set's cardinality in O(1) without scanning members."
      },
      {
        "letter": "C",
        "text": "Sets maintain insertion order, so customers can be retrieved in the order they first placed an order that day."
      },
      {
        "letter": "D",
        "text": "Adding the same customer ID multiple times does not create duplicates, so uniqueness is enforced without application-side duplicate checks."
      },
      {
        "letter": "E",
        "text": "Sets natively support union and intersection operations, so comparing unique customers across restaurants or across days can be done directly in Redis without pulling data into the application."
      }
    ],
    "correctAnswers": [
      "B",
      "D",
      "E"
    ],
    "explanation": "The correct answer is B, D, E. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-50",
    "questionNumber": 50,
    "domain": "Sets, Sorted Sets & Streams",
    "title": "SADD Return Value",
    "leadInText": "Your team implements the daily unique customer tracker:",
    "codeSnippet": "from datetime import date\n\ndef track_customer(r, customer_id):\n    today = date.today().isoformat()\n    key = f'customers:unique:{today}'\n    result = r.sadd(key, customer_id)\n    return result",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "1, 0, 0, SADD returns the number of members that were actually added. The first call adds a new member and returns 1. The second and third find the member already present and return 0."
      },
      {
        "letter": "B",
        "text": "1, 2, 3, SADD returns the total number of members in the Set after each insertion."
      },
      {
        "letter": "C",
        "text": "True, False, False, SADD returns a boolean indicating whether the member was new to the Set."
      },
      {
        "letter": "D",
        "text": "1, 1, 1, SADD returns 1 for every successful call, regardless of whether the member already exists."
      }
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-51",
    "questionNumber": 51,
    "domain": "Sets, Sorted Sets & Streams",
    "title": "Set Intersection",
    "leadInText": "The marketing team wants to identify customers who ordered from two different restaurants on the same day for a cross-promotion campaign. You have:",
    "codeSnippet": "customers:unique:rest:5:2025-03-25\ncustomers:unique:rest:7:2025-03-25",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "SUNION customers:unique:rest:5:2025-03-25 customers:unique:rest:7:2025-03-25"
      },
      {
        "letter": "B",
        "text": "SDIFF customers:unique:rest:5:2025-03-25 customers:unique:rest:7:2025-03-25"
      },
      {
        "letter": "C",
        "text": "SMEMBERS customers:unique:rest:5:2025-03-25 followed by SISMEMBER for each customer in the second set"
      },
      {
        "letter": "D",
        "text": "SINTER customers:unique:rest:5:2025-03-25 customers:unique:rest:7:2025-03-25"
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-52",
    "questionNumber": 52,
    "domain": "Sets, Sorted Sets & Streams",
    "title": "Race Condition During Set Cleanup",
    "leadInText": "At midnight, your application needs to clean up customer tracking sets from 7 days ago. You retrieve all customer IDs from the old set before deleting it to generate a weekly summary report.",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Replace the two commands with SPOP with a count parameter to atomically retrieve and remove all members in a single command."
      },
      {
        "letter": "B",
        "text": "Use SMEMBERS followed by DEL as shown. This is the correct approach since you need the full member list before deletion."
      },
      {
        "letter": "C",
        "text": "The code has a race condition. Another process might add a customer between SMEMBERS and DEL. Use RENAMENX to atomically move the key to an archive namespace, then read from there."
      },
      {
        "letter": "D",
        "text": "Use SSCAN instead of SMEMBERS because SMEMBERS blocks the server for large Sets. Then delete in a separate operation."
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-53",
    "questionNumber": 53,
    "domain": "Sets, Sorted Sets & Streams",
    "title": "Weekly Unique Customer Count",
    "leadInText": "Your analytics team needs an exact weekly unique customer count every Monday. You have daily Sets from:",
    "codeSnippet": "customers:unique:2025-03-24\n...\ncustomers:unique:2025-03-30",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "SCARD on each daily key, then sum the seven daily cardinalities."
      },
      {
        "letter": "B",
        "text": "SUNION across the 7 daily keys, then count returned customers in the application."
      },
      {
        "letter": "C",
        "text": "SUNIONSTORE customers:unique:2025-W13 daily keys, then use its integer reply."
      },
      {
        "letter": "D",
        "text": "SINTER across the 7 daily keys, then count customers who appear every day."
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-54",
    "questionNumber": 54,
    "domain": "Sets, Sorted Sets & Streams",
    "title": "Trending Dishes Sorted Set",
    "leadInText": "Your team is implementing a \"trending dishes\" feature that shows the most-ordered dishes across all restaurants in the past hour. Each time a dish is ordered, you update a Sorted Set. What should the score represent to make the trending calculation accurate?",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "The dish's average rating. This allows the highest-rated dishes to rise to the top as customers leave feedback."
      },
      {
        "letter": "B",
        "text": "The dish's price. More expensive dishes are ranked higher to maximize revenue visibility."
      },
      {
        "letter": "C",
        "text": "The order count. Increment the score by 1 each time the dish is ordered. Higher scores mean more orders."
      },
      {
        "letter": "D",
        "text": "The order's Unix timestamp. The most recently ordered dishes will have the highest scores and appear at the top."
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-55",
    "questionNumber": 55,
    "domain": "Sets, Sorted Sets & Streams",
    "title": "ZADD Existing Member",
    "leadInText": "Your team initializes the trending dishes Sorted Set with some seed data, then processes incoming orders:",
    "codeSnippet": "r.zadd('trending:dishes', {'Pizza': 5, 'Burger': 3, 'Sushi': 8})\n\nresult = r.zadd('trending:dishes', {'Sushi': 12})",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "result is 1 and Sushi's score is 12. ZADD returns 1 because the score changed, treating it as a new entry."
      },
      {
        "letter": "B",
        "text": "result is 0 and Sushi's score is 12. ZADD returns the number of \"new\" members added, since Sushi already exists, no new member was added, but the score was updated to 12."
      },
      {
        "letter": "C",
        "text": "result is 0 and Sushi's score is 8. ZADD ignores the call entirely because Sushi is already a member, preserving the original score."
      },
      {
        "letter": "D",
        "text": "result is 1 and Sushi's score is 20. ZADD automatically adds the new score to the existing score and returns 1 to indicate the score was modified."
      }
    ],
    "correctAnswers": [
      "B"
    ],
    "explanation": "The correct answer is B. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-56",
    "questionNumber": 56,
    "domain": "Sets, Sorted Sets & Streams",
    "title": "Top 3 Sorted Set Members With Scores",
    "leadInText": "You need to display the top 3 trending dishes with their order counts on the home screen. The Sorted Set <code>trending:dishes</code> currently contains:",
    "codeSnippet": "Pizza (25), Burger (18), Sushi (42), Tacos (31), Salad (12)",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "top3 = r.zrange('trending:dishes', -3, -1, desc=True)"
      },
      {
        "letter": "B",
        "text": "top3 = r.zrange('trending:dishes', 0, 2)"
      },
      {
        "letter": "C",
        "text": "top3 = r.zrange('trending:dishes', 0, 2, desc=True, withscores=True)"
      },
      {
        "letter": "D",
        "text": "top3 = r.zrange('trending:dishes', 0, 2, withscores=True)"
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-57",
    "questionNumber": 57,
    "domain": "Sets, Sorted Sets & Streams",
    "title": "ZINCRBY on a New Member",
    "leadInText": "Each time a dish is ordered, the trending score needs to increment by 1. You review the implementation:",
    "codeSnippet": "def record_dish_order(r, dish_name):\n    new_score = r.zincrby('trending:dishes', 1, dish_name)\n    return new_score",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "The call adds Ramen to the Sorted Set but returns None because the member didn't previously exist. The score is set to 1 internally but isn't returned until the next ZSCORE call."
      },
      {
        "letter": "B",
        "text": "The call throws an error because ZINCRBY requires the member to already exist in the Sorted Set before its score can be incremented."
      },
      {
        "letter": "C",
        "text": "The call creates Ramen as a new member with a score of 0.0 and returns 0.0. The increment is applied on the next call, not the initial creation."
      },
      {
        "letter": "D",
        "text": "The call creates Ramen as a new member with a score of 1.0 and returns 1.0. ZINCRBY treats a non-existent member as having a score of 0 before applying the increment."
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-58",
    "questionNumber": 58,
    "domain": "Sets, Sorted Sets & Streams",
    "title": "ZRANK",
    "leadInText": "Your team uses <code>ZRANK</code> to show each dish's ranking position on the trending page. The Sorted Set contains:",
    "codeSnippet": "Salad (12), Burger (18), Pizza (25), Tacos (31), Sushi (42)",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "25, ZRANK returns the member's score, not its positional rank."
      },
      {
        "letter": "B",
        "text": "2, ZRANK is 0-based and orders from lowest to highest score."
      },
      {
        "letter": "C",
        "text": "3, ZRANK is 1-based and orders from highest to lowest score."
      },
      {
        "letter": "D",
        "text": "2, ZRANK is 0-based and orders from highest to lowest score."
      }
    ],
    "correctAnswers": [
      "B"
    ],
    "explanation": "The correct answer is B. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-59",
    "questionNumber": 59,
    "domain": "Production Scenarios & Architecture",
    "title": "JSONPath Wildcard Query",
    "leadInText": "Your team stores each restaurant's menu as a JSON document:",
    "codeSnippet": "r.json().set('menu:rest:5', '$', {\n    'restaurant': 'Sakura Sushi',\n    'categories': [\n        {\n            'name': 'Appetizers',\n            'items': [\n                {'dish': 'Edamame', 'price': 5.99, 'available': True},\n                {'dish': 'Gyoza', 'price': 7.50, 'available': False}\n            ]\n        },\n        {\n            'name': 'Entrees',\n            'items': [\n                {'dish': 'Salmon Roll', 'price': 14.99, 'available': True}\n            ]\n        }\n    ]\n})",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "prices = r.json().get('menu:rest:5', '$.categories[0].items[0].price')"
      },
      {
        "letter": "B",
        "text": "prices = r.json().get('menu:rest:5', '$.categories.items.price')"
      },
      {
        "letter": "C",
        "text": "prices = r.json().get('menu:rest:5', '$.price')"
      },
      {
        "letter": "D",
        "text": "prices = r.json().get('menu:rest:5', '$.categories[*].items[*].price')"
      }
    ],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-60",
    "questionNumber": 60,
    "domain": "Production Scenarios & Architecture",
    "title": "Updating a Nested JSON Field",
    "leadInText": "A restaurant stores its menu as the JSON document shown in Question 59. The restaurant updates Edamame from <code>$5.99</code> to <code>$6.99</code>. Category and item order may change over time, but dish names are unique within the menu. Which approach updates only Edamame's price without replacing the entire document?",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "r.json().set('menu:rest:5', '$.categories[*].items[?(@.dish==\"Edamame\")].price', 6.99)"
      },
      {
        "letter": "B",
        "text": "r.json().set('menu:rest:5', '$.categories.items.price', 6.99)"
      },
      {
        "letter": "C",
        "text": "r.json().set('menu:rest:5', '$.categories[0].items[0].price', 6.99)"
      },
      {
        "letter": "D",
        "text": "r.json().set('menu:rest:5', '$', {'categories': [{'items': [{'dish': 'Edamame', 'price': 6.99}]}]})"
      }
    ],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-61",
    "questionNumber": 61,
    "domain": "Production Scenarios & Architecture",
    "title": "JSON.MERGE",
    "leadInText": "A restaurant needs to update its menu document in one call: change the phone number, add a new <code>website</code> field, and remove the <code>fax</code> field. Which <code>JSON.MERGE</code> call achieves all three changes?",
    "codeSnippet": "r.json().merge('menu:rest:5', '$', {\n    'phone': '555-0200',\n    'website': 'sakur​asushi.com',\n    'fax': None\n})",
    "chooseCount": 1,
    "options": [],
    "correctAnswers": [
      "D"
    ],
    "explanation": "The correct answer is D. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-62",
    "questionNumber": 62,
    "domain": "Production Scenarios & Architecture",
    "title": "AOF Persistence",
    "leadInText": "After a production server crash, the team discovers that the last 3 minutes of orders were lost. Restaurant dashboards showed orders that are no longer in Redis. The current persistence configuration uses RDB snapshots every 5 minutes. What change would minimize data loss for this real-time orders use case?",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "Increase RDB snapshot frequency to every 60 seconds. This reduces the maximum data-loss window while keeping the simpler snapshot-based recovery."
      },
      {
        "letter": "B",
        "text": "Disable persistence entirely and rely on the application to replay orders from the primary database on Redis restart."
      },
      {
        "letter": "C",
        "text": "Switch to AOF with appendfsync everysec. This writes operations to the append-only log every second, limiting data loss to approximately one second rather than up to 5 minutes."
      },
      {
        "letter": "D",
        "text": "Enable AOF with appendfsync always so that every write is immediately persisted to disk, guaranteeing zero data loss."
      }
    ],
    "correctAnswers": [
      "C"
    ],
    "explanation": "The correct answer is C. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-63",
    "questionNumber": 63,
    "domain": "Production Scenarios & Architecture",
    "title": "Safely Scanning Millions of Keys",
    "leadInText": "Your operations team needs to audit all restaurant menu keys to verify a migration completed successfully. The production Redis instance has 50 million keys across all data types. Which approach safely retrieves all keys without impacting production traffic?",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "OBJECT FREQ menu:rest:*"
      },
      {
        "letter": "B",
        "text": "SCAN 0 MATCH menu:rest:* COUNT 1000 in an iterative loop."
      },
      {
        "letter": "C",
        "text": "DBSIZE followed by RANDOMKEY in a loop."
      },
      {
        "letter": "D",
        "text": "KEYS menu:rest:*"
      }
    ],
    "correctAnswers": [
      "B"
    ],
    "explanation": "The correct answer is B. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-64",
    "questionNumber": 64,
    "domain": "Production Scenarios & Architecture",
    "title": "Deleting a Large Sorted Set",
    "leadInText": "At the end of each day, your cleanup job needs to delete the trending dishes Sorted Set, which contains approximately 100,000 members. You want to minimize impact on concurrent operations. Which approach is best?",
    "codeSnippet": "",
    "chooseCount": 1,
    "options": [
      {
        "letter": "A",
        "text": "EXPIRE trending:dishes:2025-03-25 1"
      },
      {
        "letter": "B",
        "text": "UNLINK trending:dishes:2025-03-25"
      },
      {
        "letter": "C",
        "text": "ZREMRANGEBYRANK trending:dishes:2025-03-25 0 -1"
      },
      {
        "letter": "D",
        "text": "DEL trending:dishes:2025-03-25"
      }
    ],
    "correctAnswers": [
      "B"
    ],
    "explanation": "The correct answer is B. In Redis, this behavior is verified according to the official Redis Developer specification."
  },
  {
    "id": "redis-q-65",
    "questionNumber": 65,
    "domain": "Production Scenarios & Architecture",
    "title": "Deleting Multiple Keys in redis-py",
    "leadInText": "Your cleanup routine needs to delete multiple old keys at once. You have a list of 500 keys to remove. What is the most efficient approach in redis-py?",
    "codeSnippet": "def cleanup_old_keys(r, keys_to_delete):\n    # Which implementation is most efficient?",
    "chooseCount": 1,
    "options": [],
    "correctAnswers": [
      "A"
    ],
    "explanation": "The correct answer is A. In Redis, this behavior is verified according to the official Redis Developer specification."
  }
]
};

export const ALL_EXAM_DUMPS_DATA: Record<string, ExamDumpData> = {
  "redis-certified-developer": REDIS_DEVELOPER_EXAM,
  "redis-developer": REDIS_DEVELOPER_EXAM,
  "redis": REDIS_DEVELOPER_EXAM
};
