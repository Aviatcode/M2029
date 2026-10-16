# 📝 Official Active Assignments & Lab Submissions
This register details all coursework assignments, problem sets, and submission criteria for BCA-2028.

---

### 1. Hospital Management System: ER Diagram & Normalization to 3NF
* **Subject:** Database Management Systems
* **Official Due Date:** `2026-10-17` (🔥 Due Today!)
* **Assigned By:** Dr. Rajesh Sharma
* **Submission Status:** ⏳ **PENDING (Action Required)**

#### 📋 Problem Statement & Instructions:
> Design an ER diagram with at least 5 entities including Doctors, Patients, Appointments, and Bills. Normalize the tables to 3NF and prove no partial dependencies exist.

#### 🎯 Step-by-Step Execution Plan:
1. Step 1: Identify real-world entities and relationship cardinalities (1:M, M:N)
1. Step 2: Convert ER diagram into relational schemas with primary and foreign keys
1. Step 3: Test functional dependencies and demonstrate 2NF and 3NF decomposition
1. Step 4: Provide sample SQL DDL statements (CREATE TABLE with foreign key constraints)

#### 📖 Prescribed Key References:
- *Silberschatz, Korth, Sudarshan - Database System Concepts (Chapter 2 & 7)*
- *Dr. Verma Class PPT Unit 2 Normalization*

> 💡 **Faculty Guidance & Hint:** Focus on explaining WHY the decomposition prevents insertion and deletion anomalies rather than just listing tables.

---

### 2. Producer-Consumer Problem using synchronized and wait/notify
* **Subject:** Java Programming
* **Official Due Date:** `2026-10-20` (⏳ 3 days remaining)
* **Assigned By:** Prof. Ananya Sen
* **Submission Status:** ⏳ **PENDING (Action Required)**

#### 📋 Problem Statement & Instructions:
> Implement thread synchronization in Java for a bounded buffer producer-consumer model. Handle buffer overflow and underflow conditions using wait() and notifyAll().

#### 🎯 Step-by-Step Execution Plan:
1. Step 1: Define BoundedBuffer class with shared queue and capacity
1. Step 2: Implement synchronized produce() and consume() methods with wait()
1. Step 3: Create Producer and Consumer Runnable worker threads
1. Step 4: Demonstrate deadlock-free execution in main driver method

#### 📖 Prescribed Key References:
- *Herbert Schildt - Java: The Complete Reference (Chapter 11 Multi-threading)*

> 💡 **Faculty Guidance & Hint:** Always put wait() inside a while-loop condition to handle spurious wakeups.

---

### 3. Class Presentation: Deadlock Avoidance using Banker's Algorithm & Safety State Matrix
* **Subject:** Operating Systems
* **Official Due Date:** `2026-10-22` (⏳ 5 days remaining)
* **Assigned By:** Class Representative (CR) / Faculty Schedule
* **Submission Status:** ⏳ **PENDING (Action Required)**

#### 📋 Problem Statement & Instructions:
> Prepare a 10-slide PowerPoint presentation with visual dry-run on 5 processes (P0-P4) and 3 resource types (A, B, C). Explain Need Matrix, Allocation Matrix, and Safe Sequence determination.

#### 🎯 Step-by-Step Execution Plan:
1. Slide 1-2: What is Deadlock & Coffman Conditions
1. Slide 3-5: Banker's Algorithm Data Structures (Available, Max, Allocation, Need)
1. Slide 6-8: Step-by-Step Trace of Safety Algorithm with numerical example
1. Slide 9-10: Resource Request Algorithm & Real-world OS comparison

#### 📖 Prescribed Key References:
- *Galvin, Silberschatz - Operating System Concepts (Chapter 8 Deadlocks)*

> 💡 **Faculty Guidance & Hint:** Highlight that Banker's algorithm requires knowing maximum resource requests in advance, which is its main practical drawback.

---

### 4. Class Presentation: B-Tree vs B+ Tree Indexing in High-Throughput Databases
* **Subject:** Database Management Systems
* **Official Due Date:** `2026-10-24` (⏳ 7 days remaining)
* **Assigned By:** Class Representative (CR) / Faculty Schedule
* **Submission Status:** ⏳ **PENDING (Action Required)**

#### 📋 Problem Statement & Instructions:
> Explain balanced multi-way tree structures, differences between B-Tree and B+ Tree (leaves linked as linked-list for range queries), and performance in disk I/O.

#### 🎯 Step-by-Step Execution Plan:
1. Slide 1-3: Linear vs Index file scan disk I/O costs
1. Slide 4-6: B+ Tree internal node structure vs leaf node storage
1. Slide 7-8: Insert & Split operations with trace
1. Slide 9-10: Why MySQL InnoDB and PostgreSQL default to B+ Tree indexes

#### 📖 Prescribed Key References:
- *Database System Concepts Chapter 14 Indexing & Hashing*

> 💡 **Faculty Guidance & Hint:** Emphasize that all data records/pointers are stored exclusively at the leaf level in B+ trees, allowing higher fan-out in internal nodes.

---

