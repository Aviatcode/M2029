# 📚 High-Yield Academic Revision Notes & 7-Minute Primers
Curated, high-retention study primers for BCA-2028 semester examinations.

---

## 📌 1. Database Normalization Quick Cheatsheet (CS301)
* **1NF:** All attribute values must be atomic. No repeating groups or arrays.
* **2NF:** Must be in 1NF + No partial dependency (No non-prime attribute depends on a proper subset of candidate key).
* **3NF:** Must be in 2NF + No transitive dependency (X -> Y is valid only if X is superkey OR Y is prime attribute).
* **BCNF:** For every non-trivial functional dependency X -> Y, X MUST be a superkey. Strictly stronger than 3NF.
* **Lossless Join vs Dependency Preservation:** 3NF decomposition guarantees both lossless join and dependency preservation. BCNF guarantees lossless join but may sacrifice dependency preservation.

---

## 📌 2. Java Concurrency & Multithreading Rules (CS302)
* **Thread States:** `NEW`, `RUNNABLE`, `BLOCKED`, `WAITING`, `TIMED_WAITING`, `TERMINATED`.
* **Synchronized Blocks vs Methods:** Synchronizing on `this` locks the current instance; synchronizing on a static method locks the `Class` object.
* **wait() vs sleep():** `wait()` releases the monitor lock and belongs to `java.lang.Object`. `sleep()` holds the lock and belongs to `java.lang.Thread`.
* **Volatile Keyword:** Ensures memory visibility across thread caches; prevents compiler reordering but does NOT guarantee atomicity for compound operations (e.g., `count++`).

---

## 📌 3. Operating Systems: 4 Coffman Deadlock Conditions (CS303)
Deadlock occurs if and only if all four conditions hold simultaneously:
1. **Mutual Exclusion:** At least one resource must be held in non-shareable mode.
2. **Hold and Wait:** A process holds at least one resource while requesting additional resources held by other processes.
3. **No Preemption:** Resources cannot be forcibly preempted; released only voluntarily by the process.
4. **Circular Wait:** A closed cycle exists {P0, P1, ..., Pn} such that Pi waits for a resource held by P(i+1).
