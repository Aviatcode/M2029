# 📝 Producer-Consumer Problem using synchronized and wait/notify
* **Subject:** Java Programming (BCA-301)
* **Folder Location:** `assignments/java-programming/01-producer-consumer-problem-using-synchronized-.md`
* **Due Date:** `2026-10-20`
* **Assigned By:** Prof. Ananya Sen
* **Submission Status:** ⏳ Pending

---

## 📋 Problem Statement & Instructions
> Implement thread synchronization in Java for a bounded buffer producer-consumer model. Handle buffer overflow and underflow conditions using wait() and notifyAll().



---

## 🎯 Step-by-Step Execution Plan
1. Step 1: Define BoundedBuffer class with shared queue and capacity
2. Step 2: Implement synchronized produce() and consume() methods with wait()
3. Step 3: Create Producer and Consumer Runnable worker threads
4. Step 4: Demonstrate deadlock-free execution in main driver method

---

## 📖 References & Suggested Readings
- *Herbert Schildt - Java: The Complete Reference (Chapter 11 Multi-threading)*


> 💡 **Instructor Guidance:** Always put wait() inside a while-loop condition to handle spurious wakeups.

