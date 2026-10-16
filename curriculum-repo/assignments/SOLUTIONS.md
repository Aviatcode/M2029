# 💡 Model Academic Solutions & Full-Credit Submission Templates
Comprehensive, university-grade reference solutions for BCA-2028 coursework assignments.

---

## 📘 1. Database Design & 3NF Normalization (Hostel Management System)
**Subject:** Database Management Systems (CS301) | **Faculty:** Dr. Rajesh Sharma

### 🎓 Executive Summary & Problem Formulation
In university student accommodation systems, un-normalized relational schemas cause significant redundancy, update anomalies, insertion anomalies, and deletion anomalies. This solution presents the formal functional dependency analysis and progressive schema normalization from 1NF to 3NF.

### 📐 Functional Dependencies (FDs)
Given un-normalized relation `R(StudentID, StudentName, RoomNumber, HostelBlock, WardenName, MonthlyRent)`:
1. `StudentID → StudentName, RoomNumber, HostelBlock`
2. `RoomNumber, HostelBlock → MonthlyRent`
3. `HostelBlock → WardenName`

### 📝 Step-by-Step 3NF Decomposition
* **First Normal Form (1NF):** Eliminate multi-valued attributes and ensure atomic domains for all attributes.
* **Second Normal Form (2NF):** Eliminate partial functional dependencies. All non-key attributes are fully functionally dependent on candidate key `StudentID`.
* **Third Normal Form (3NF):** Eliminate transitive dependencies (`StudentID → HostelBlock` and `HostelBlock → WardenName`).

#### Decomposed Relational Schemas:
```sql
-- 1. Student Master Table
CREATE TABLE Students (
    StudentID VARCHAR(20) PRIMARY KEY,
    StudentName VARCHAR(100) NOT NULL,
    RoomNumber INT NOT NULL,
    HostelBlock VARCHAR(10) NOT NULL,
    FOREIGN KEY (HostelBlock, RoomNumber) REFERENCES HostelRooms(HostelBlock, RoomNumber)
);

-- 2. Hostel Room Specification Table
CREATE TABLE HostelRooms (
    HostelBlock VARCHAR(10) NOT NULL,
    RoomNumber INT NOT NULL,
    MonthlyRent DECIMAL(8,2) NOT NULL,
    PRIMARY KEY (HostelBlock, RoomNumber),
    FOREIGN KEY (HostelBlock) REFERENCES HostelBlocks(HostelBlock)
);

-- 3. Hostel Block & Warden Table (Eliminates Transitive Dependency)
CREATE TABLE HostelBlocks (
    HostelBlock VARCHAR(10) PRIMARY KEY,
    WardenName VARCHAR(100) NOT NULL,
    WardenContact VARCHAR(15)
);
```

---

## ☕ 2. Producer-Consumer Problem using synchronized and wait/notify
**Subject:** Core Java Programming (CS302) | **Faculty:** Prof. Ananya Sen

### 🎓 Theoretical Architecture & Synchronization Invariants
The classical Bounded-Buffer Producer-Consumer model requires:
1. Mutual exclusion: Only one worker thread accesses the shared buffer queue at a time.
2. Underflow prevention: Consumer thread waits when buffer is empty (`queue.isEmpty()`).
3. Overflow prevention: Producer thread waits when buffer reaches capacity (`queue.size() == capacity`).
4. **Spurious Wakeup Prevention:** The condition check MUST be inside a `while` loop, never an `if` statement.

### 💻 Production Java Implementation
```java
import java.util.LinkedList;
import java.util.Queue;

public class BoundedBuffer<T> {
    private final Queue<T> queue = new LinkedList<>();
    private final int capacity;

    public BoundedBuffer(int capacity) {
        this.capacity = capacity;
    }

    public synchronized void produce(T item) throws InterruptedException {
        // ALWAYS use while loop to guard against spurious wakeups
        while (queue.size() == capacity) {
            wait();
        }
        queue.add(item);
        System.out.println("[PRODUCED]: " + item + " (Queue Size: " + queue.size() + ")");
        // Wake up sleeping consumer threads
        notifyAll();
    }

    public synchronized T consume() throws InterruptedException {
        while (queue.isEmpty()) {
            wait();
        }
        T item = queue.poll();
        System.out.println("[CONSUMED]: " + item + " (Remaining: " + queue.size() + ")");
        // Wake up sleeping producer threads
        notifyAll();
        return item;
    }
}
```

---

## 🖥️ 3. Deadlock Avoidance: Banker's Algorithm Numerical Matrix Trace
**Subject:** Operating Systems (CS303) | **Faculty:** Dr. Vikram Malhotra

### 🎓 System State Definition
Consider a system with 5 Processes (`P0, P1, P2, P3, P4`) and 3 Resource Types (`A: 10, B: 5, C: 7`).

#### Snapshot at Time T0:
* **Available Vector:** `[3, 3, 2]`
* **Need Matrix Calculation:** `Need[i][j] = Max[i][j] - Allocation[i][j]`

| Process | Allocation (A B C) | Max (A B C) | Need (A B C) |
| :-: | :-: | :-: | :-: |
| **P0** | 0 1 0 | 7 5 3 | 7 4 3 |
| **P1** | 2 0 0 | 3 2 2 | 1 2 2 |
| **P2** | 3 0 2 | 9 0 2 | 6 0 0 |
| **P3** | 2 1 1 | 2 2 2 | 0 1 1 |
| **P4** | 0 0 2 | 4 3 3 | 4 3 1 |

### 🔍 Safety Algorithm Step-by-Step Trace:
1. **Check P1:** Need `[1, 2, 2] <= Available [3, 3, 2]` -> **TRUE**.  
   *P1 executes.* `New Available = [3, 3, 2] + Allocation[2, 0, 0] = [5, 3, 2]`.
2. **Check P3:** Need `[0, 1, 1] <= Available [5, 3, 2]` -> **TRUE**.  
   *P3 executes.* `New Available = [5, 3, 2] + Allocation[2, 1, 1] = [7, 4, 3]`.
3. **Check P4:** Need `[4, 3, 1] <= Available [7, 4, 3]` -> **TRUE**.  
   *P4 executes.* `New Available = [7, 4, 3] + Allocation[0, 0, 2] = [7, 4, 5]`.
4. **Check P0:** Need `[7, 4, 3] <= Available [7, 4, 5]` -> **TRUE**.  
   *P0 executes.* `New Available = [7, 4, 5] + Allocation[0, 1, 0] = [7, 5, 5]`.
5. **Check P2:** Need `[6, 0, 0] <= Available [7, 5, 5]` -> **TRUE**.  
   *P2 executes.* `New Available = [7, 5, 5] + Allocation[3, 0, 2] = [10, 5, 7]`.

**Result:** The system is in a **SAFE STATE** with Safe Execution Sequence:  
`<P1, P3, P4, P0, P2>`
