import { Classroom, LessonContent } from './types';

export const DEFAULT_LESSONS: Record<string, LessonContent> = {
  'topic-queue-circ': {
    topicId: 'topic-queue-circ',
    source: 'cache',
    cachedAt: '2026-10-08T07:00:00Z',
    eli9: {
      hook: 'Imagine standing in line for concert tickets, but whenever the front person leaves, nobody moves forward and that ticket counter slot is locked forever!',
      analogy: 'Think of a Circular Queue like a Ferris wheel or a round sushi conveyor belt. When the first passenger steps off cart #1, the next person in line does not stay stuck—the cart rotates back around and is instantly ready for someone new. The queue has no "dead ends" because the tail connects back to the head using clock arithmetic (modulo %)!',
      coreMechanism: 'In a regular linear queue, once elements are removed from the FRONT, that space in memory is wasted even if REAR is at the end. Circular Queue fixes this memory leak by wrapping REAR back to index 0 using: (rear + 1) % MAX_SIZE.',
      beforeClassTakeaway: 'In today\'s lecture, your professor will write `(rear + 1) % MAX`. Remember: the percent sign is just the "wrap-around wheel" that recycles empty front seats!'
    },
    mnemonic: {
      phrase: 'W - R - A - P (Wrap, Rear, Available, Pop)',
      breakdown: [
        'W: Wrap around using modulo (idx % capacity)',
        'R: Rear advances on enqueue (insertion)',
        'A: Available front slot is recycled instantly',
        'P: Pop/Dequeue advances Front pointer'
      ],
      memoryTip: 'Remember: In a circle, nobody reaches a dead end, they just "WRAP" around!'
    },
    mindmap: {
      mermaid: `graph TD
  A[Circular Queue] --> B[Why It Exists]
  A --> C[Core Pointers]
  A --> D[Full / Empty Conditions]
  A --> E[Exam Pitfalls]

  B --> B1[Solves Linear Queue Memory Wastage]
  B --> B2[Reuses Empty Front Slots]

  C --> C1[FRONT: Dequeue / Removal]
  C --> C2[REAR: Enqueue / Insertion]

  D --> D1[Empty: FRONT == -1]
  D --> D2[Full: (REAR + 1) % MAX == FRONT]

  E --> E1[Forgetting Modulo % Math]
  E --> E2[Overwriting Front on Overflow]`,
      nodes: [
        {
          id: 'root',
          label: 'Circular Queue (Ring Buffer)',
          type: 'root',
          children: [
            {
              id: 'motivation',
              label: '1. The Problem Solved',
              type: 'category',
              description: 'Linear Queue suffers from "False Overflow" — memory at the beginning is wasted after elements dequeue.',
              children: [
                { id: 'm1', label: 'False Overflow: rear == MAX-1 but front > 0', type: 'detail' },
                { id: 'm2', label: 'Ring topology reclaims memory at O(1) time', type: 'detail' }
              ]
            },
            {
              id: 'pointers',
              label: '2. Pointer Rules',
              type: 'category',
              description: 'Front and Rear traverse array cyclically.',
              children: [
                { id: 'p1', label: 'Insert: rear = (rear + 1) % SIZE', type: 'detail' },
                { id: 'p2', label: 'Delete: front = (front + 1) % SIZE', type: 'detail' }
              ]
            },
            {
              id: 'conditions',
              label: '3. Boundary Checks',
              type: 'category',
              description: 'Crucial conditions examiners grade strictly.',
              children: [
                { id: 'c1', label: 'Empty: front == -1', type: 'detail' },
                { id: 'c2', label: 'Full: (rear + 1) % SIZE == front', type: 'detail' }
              ]
            }
          ]
        }
      ]
    },
    exam10Marker: {
      definition: 'A Circular Queue (also known as a Ring Buffer) is an abstract linear data structure that operates on the First-In, First-Out (FIFO) principle, where the last node or index is logically connected back to the first node to form a closed continuous circle. It overcomes the fundamental limitation of "false overflow" or external memory fragmentation present in linear queues implemented via contiguous arrays.',
      architectureDiagramText: `+-------------------------------------------------------+
|                 CIRCULAR QUEUE LAYOUT                |
|                                                       |
|       Index 0       Index 1       Index 2    Index 3  |
|    +-----------+ +-----------+ +-----------+ +------+ |
|    | [ FRONT ] | |  Item B   | | [ REAR ]  | | Free | |
|    +-----------+ +-----------+ +-----------+ +------+ |
|          ^                           ^                |
|          |                           |                |
|      (Dequeue)                   (Enqueue)            |
|          |                           |                |
|          +--------< (Wrap Around) <--+                |
|                 Formula: (i + 1) % SIZE               |
+-------------------------------------------------------+`,
      stepByStepMechanism: [
        '1. Initialization: Set FRONT = -1 and REAR = -1 to represent an empty queue.',
        '2. Enqueue (Insertion): Check if Queue is Full: ((REAR + 1) % SIZE == FRONT). If full, trigger Overflow. If empty, set FRONT = REAR = 0. Else, advance REAR = (REAR + 1) % SIZE and store item.',
        '3. Dequeue (Deletion): Check if Queue is Empty: (FRONT == -1). If empty, trigger Underflow. If FRONT == REAR (only 1 item), reset FRONT = REAR = -1. Else, advance FRONT = (FRONT + 1) % SIZE.',
        '4. Modulo Arithmetic: The modulo operation ensures bounds stay within [0, SIZE - 1] without costly memory shifting.'
      ],
      codeOrAlgorithm: `/* C Implementation of Circular Queue Operations */
#include <stdio.h>
#define SIZE 5

int queue[SIZE];
int front = -1, rear = -1;

int isFull() {
    return ((rear + 1) % SIZE == front);
}

int isEmpty() {
    return (front == -1);
}

void enqueue(int value) {
    if (isFull()) {
        printf("Overflow Error: Circular Queue is Full\\n");
        return;
    }
    if (isEmpty()) {
        front = rear = 0;
    } else {
        rear = (rear + 1) % SIZE;
    }
    queue[rear] = value;
    printf("Inserted %d at index %d\\n", value, rear);
}

int dequeue() {
    if (isEmpty()) {
        printf("Underflow Error: Circular Queue is Empty\\n");
        return -1;
    }
    int item = queue[front];
    if (front == rear) {
        // Last element removed, reset to empty
        front = rear = -1;
    } else {
        front = (front + 1) % SIZE;
    }
    return item;
}`,
      advantagesDisadvantages: {
        advantages: [
          'Zero Memory Wastage: Completely eliminates false overflow in static array memory.',
          'Constant Time Complexity: O(1) for both enqueue and dequeue operations.',
          'Predictable Bounds: Ideal for fixed-buffer applications like printer spools, CPU round-robin scheduling, and audio streams.'
        ],
        disadvantages: [
          'Fixed Maximum Capacity when using static array allocation.',
          'One slot overhead or extra flag needed in certain implementations to distinguish Full vs Empty.'
        ]
      },
      examinerTraps: [
        'Trap 1: Writing `rear == SIZE - 1` as the Full condition. Examiners will instantly deduct 4 marks because in a circular queue, rear could be 1 while front is 2!',
        'Trap 2: Forgetting to reset both `front = rear = -1` when the last remaining element is dequeued.',
        'Trap 3: Not mentioning the Modulo formula `(rear + 1) % SIZE` in your algorithm steps.'
      ]
    },
    pyqs: [
      {
        id: 'pyq-1',
        type: '2_marks',
        marks: 2,
        question: 'Define False Overflow in a Linear Queue and how Circular Queue remedies it.',
        modelAnswer: 'False overflow occurs in a linear queue when the REAR pointer reaches the array bound (REAR == MAX - 1), preventing new insertions even if elements have been deleted from the FRONT creating empty spaces. A Circular Queue remedies this by wrapping REAR back to index 0 using modulo arithmetic `(REAR + 1) % MAX`, reusing unoccupied slots.',
        keyPointsForExaminer: ['Mention REAR == MAX - 1', 'Mention unused front space', 'State modulo wrap-around equation']
      },
      {
        id: 'pyq-2',
        type: '10_marks',
        marks: 10,
        question: 'Explain the working of Circular Queue with full Enqueue and Dequeue algorithms. Show step-by-step array diagram for inserting 5 elements into a queue of size 4.',
        modelAnswer: 'Step 1: Define Circular Queue concept & FIFO properties. Step 2: Full condition `(rear + 1) % SIZE == front` and Empty condition `front == -1`. Step 3: Write clean C code algorithms with overflow/underflow boundary checks. Step 4: Trace example array of SIZE=4 demonstrating wrap-around and the 5th element triggering Overflow Error with diagram illustration.',
        keyPointsForExaminer: ['Precise boundary conditions', 'Modulo operator demonstration', 'Hand-drawn tracing table or state diagrams', 'Time complexity O(1)']
      }
    ],
    conceptCheck: {
      question: 'In an array-based Circular Queue of size 6, currently FRONT = 4 and REAR = 3. What is the state of the queue?',
      options: [
        'The queue is completely Empty',
        'The queue is completely Full (Overflow condition)',
        'The queue has exactly 2 elements left',
        'This is an invalid, corrupted queue state'
      ],
      correctIndex: 1,
      explanation: 'Let us check the Full formula: (REAR + 1) % SIZE = (3 + 1) % 6 = 4 % 6 = 4. Since (REAR + 1) % SIZE equals FRONT (4 == 4), the queue is completely FULL!',
      openEndedPrompt: 'Explain in one sentence why a linear queue wastes memory even if elements are dequeued.'
    }
  },

  'topic-deadlock-banker': {
    topicId: 'topic-deadlock-banker',
    source: 'cache',
    cachedAt: '2026-10-08T07:00:00Z',
    eli9: {
      hook: 'Imagine 4 kids in a sandbox wanting to build sandcastles. There are only 3 buckets, and each kid refuses to share their bucket until their castle is finished!',
      analogy: 'Think of Deadlock like 4 cars meeting at an unmarked four-way intersection at the exact same moment. Every car has pulled into the middle, blocking the car to its left. Nobody can go forward, and nobody will reverse. The operating system is the traffic police that must prevent or break this freeze!',
      coreMechanism: 'Deadlock requires 4 conditions happening at once: Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait (Coffman Conditions). The Banker\'s Algorithm simulates loans: the OS only gives resources if at least one safe sequence exists where every process can finish.',
      beforeClassTakeaway: 'The Banker is cautious: it never gives you a resource if doing so leaves the system unable to guarantee that everyone gets their requested maximum eventually.'
    },
    mnemonic: {
      phrase: 'M - H - N - C (Make Hamburgers Not Conflict)',
      breakdown: [
        'M: Mutual Exclusion (only 1 process at a time)',
        'H: Hold and Wait (holding one, asking for another)',
        'N: No Preemption (resources cannot be snatched)',
        'C: Circular Wait (P0 waits for P1 waits for P0)'
      ],
      memoryTip: 'If you break even ONE of the 4 Coffman conditions, Deadlock CANNOT occur!'
    },
    mindmap: {
      mermaid: `graph TD
  A[Operating System Deadlocks] --> B[4 Coffman Conditions]
  A --> C[Handling Strategies]
  A --> D[Banker's Algorithm]

  B --> B1[Mutual Exclusion]
  B --> B2[Hold & Wait]
  B --> B3[No Preemption]
  B --> B4[Circular Wait]

  C --> C1[Prevention: Break 1 condition]
  C --> C2[Avoidance: Banker's Safe State]
  C --> C3[Detection & Recovery]

  D --> D1[Need = Max - Allocation]
  D --> D2[Work & Finish Vectors]
  D --> D3[Find Safe Sequence]`,
      nodes: [
        {
          id: 'root',
          label: 'Deadlock & Banker Algorithm',
          type: 'root',
          children: [
            {
              id: 'coffman',
              label: '1. The 4 Necessary Conditions',
              type: 'category',
              description: 'All 4 MUST hold simultaneously for deadlock to occur.',
              children: [
                { id: 'c1', label: 'Mutual Exclusion: Non-shareable resource', type: 'detail' },
                { id: 'c2', label: 'Hold & Wait: Retaining while requesting', type: 'detail' },
                { id: 'c3', label: 'No Preemption: Cannot forcibly reclaim', type: 'detail' },
                { id: 'c4', label: 'Circular Wait: Cyclic dependency chain', type: 'detail' }
              ]
            },
            {
              id: 'bankers',
              label: '2. Banker Algorithm (Deadlock Avoidance)',
              type: 'category',
              description: 'Dijkstra avoidance scheme calculating Safe Sequence.',
              children: [
                { id: 'b1', label: 'Matrices: Available, Max, Allocation, Need', type: 'detail' },
                { id: 'b2', label: 'Safety Algorithm: Need <= Work', type: 'detail' },
                { id: 'b3', label: 'Resource Request Algorithm: Request <= Need && Request <= Available', type: 'detail' }
              ]
            }
          ]
        }
      ]
    },
    exam10Marker: {
      definition: 'A Deadlock in an Operating System is a permanent state where a set of processes are blocked because each process holds one or more resources and is waiting for another resource acquired by some other process in the same set. The Banker\'s Algorithm (devised by Edsger Dijkstra) is a deadlock avoidance algorithm that tests for safety by simulating the allocation of predetermined maximum possible amounts of all resources before deciding whether allocation should be granted.',
      architectureDiagramText: `+-------------------------------------------------------+
|             RESOURCE ALLOCATION GRAPH (RAG)           |
|                                                       |
|        [ Process P1 ] --------> ( Resource R1 )       |
|               ^                        |              |
|               | (Holds)                | (Allocated)  |
|               |                        v              |
|        ( Resource R2 ) <------- [ Process P2 ]        |
|                                                       |
|        * CIRCULAR WAIT FORMS DEADLOCK CYCLE *         |
+-------------------------------------------------------+`,
      stepByStepMechanism: [
        '1. Data Structures: Available[m] vector, Max[n][m] matrix, Allocation[n][m] matrix, Need[n][m] matrix where Need[i][j] = Max[i][j] - Allocation[i][j].',
        '2. Safety Algorithm Step A: Let Work = Available, Finish[i] = false for all i in [0..n-1].',
        '3. Safety Algorithm Step B: Find an index i such that: Finish[i] == false AND Need[i] <= Work. If no such i exists, go to Step 4.',
        '4. Safety Algorithm Step C: If found, assume process finishes: Work = Work + Allocation[i], Finish[i] = true. Repeat Step 2.',
        '5. Safe Sequence: If Finish[i] == true for all i, system is in a SAFE STATE. Otherwise, UNSAFE state (potential deadlock).'
      ],
      codeOrAlgorithm: `/* Banker's Safety Algorithm in C */
#include <stdio.h>
#define P 5 // Processes
#define R 3 // Resources

int isSafe(int processes[], int avail[], int max[][R], int allot[][R]) {
    int need[P][R];
    for (int i = 0; i < P; i++)
        for (int j = 0; j < R; j++)
            need[i][j] = max[i][j] - allot[i][j];

    int finish[P] = {0};
    int safeSeq[P];
    int work[R];
    for (int i = 0; i < R; i++) work[i] = avail[i];

    int count = 0;
    while (count < P) {
        int found = 0;
        for (int p = 0; p < P; p++) {
            if (finish[p] == 0) {
                int j;
                for (j = 0; j < R; j++)
                    if (need[p][j] > work[j]) break;

                if (j == R) { // All needs satisfied
                    for (int k = 0; k < R; k++)
                        work[k] += allot[p][k];
                    safeSeq[count++] = p;
                    finish[p] = 1;
                    found = 1;
                }
            }
        }
        if (found == 0) {
            printf("System is NOT in a safe state!\\n");
            return 0;
        }
    }
    printf("System is in SAFE STATE. Safe Sequence: ");
    for (int i = 0; i < P; i++) printf("P%d ", safeSeq[i]);
    printf("\\n");
    return 1;
}`,
      advantagesDisadvantages: {
        advantages: [
          'Prevents Deadlock without unnecessarily restricting resource sharing like strict prevention.',
          'Guarantees the system will never enter an unsafe deadlock state.'
        ],
        disadvantages: [
          'Requires processes to state their MAXIMUM resource claim in advance, which is rarely known in real systems.',
          'Number of processes and resources must remain fixed.',
          'Significant runtime computation overhead: O(m * n^2).'
        ]
      },
      examinerTraps: [
        'Trap 1: Confusing Unsafe State with Deadlock. An unsafe state is NOT always deadlocked; it simply means the OS cannot guarantee avoiding one.',
        'Trap 2: Forgetting to compute `Need = Max - Allocation` before executing safety checks in numerical questions.',
        'Trap 3: Not updating `Work = Work + Allocation` after a process successfully completes in the simulation.'
      ]
    },
    pyqs: [
      {
        id: 'pyq-b1',
        type: '5_marks',
        marks: 5,
        question: 'List and explain the 4 Coffman conditions necessary for a Deadlock to occur.',
        modelAnswer: '1. Mutual Exclusion: At least one resource must be held in a non-shareable mode. 2. Hold and Wait: A process must be holding at least one resource and requesting additional resources currently held by others. 3. No Preemption: Resources cannot be forcibly preempted; they are released only voluntarily. 4. Circular Wait: A closed chain of processes exists {P0, P1, .. Pn} where each Pi waits for a resource held by P(i+1).',
        keyPointsForExaminer: ['Clear naming of all 4 conditions', 'Explanation of non-shareability', 'Circular chain definition']
      },
      {
        id: 'pyq-b2',
        type: '10_marks',
        marks: 10,
        question: 'Given 5 processes P0-P4 and 3 resource types A(10), B(5), C(7). Find the Need Matrix and determine if the system is in a Safe State using Banker Algorithm.',
        modelAnswer: 'Step 1: Calculate Need = Max - Allocation. Step 2: Initialize Work = Available. Step 3: Iterate through processes checking Need <= Work. Step 4: Step through sequence showing Available vector changes. Step 5: Conclude with verified Safe Sequence <P1, P3, P4, P0, P2> and prove all Finish flags are true.',
        keyPointsForExaminer: ['Complete numerical Need matrix table', 'Work vector updates after each process', 'Correct Safe Sequence formatting']
      }
    ],
    conceptCheck: {
      question: 'Is every Unsafe State in an Operating System definitely in a Deadlock?',
      options: [
        'Yes, Unsafe State is the formal synonym for Deadlock',
        'No, an Unsafe State only carries the risk of Deadlock; processes may release resources before claiming maximums',
        'Yes, because the Banker algorithm immediately halts the system',
        'No, Deadlock only occurs in single-threaded environments'
      ],
      correctIndex: 1,
      explanation: 'An unsafe state is not automatically a deadlock! It just means the operating system can no longer guarantee that a deadlock will not occur if all processes suddenly request their maximum declared needs.',
      openEndedPrompt: 'Which Coffman condition is broken if the OS enforces that all resources must be requested before process execution begins?'
    }
  }
};

export const DEFAULT_CLASSROOM: Classroom = {
  code: 'BCA-SEM3',
  name: 'BCA Semester 3 - Core Curriculum',
  university: 'State Computer Science Board',
  course: 'Bachelor of Computer Applications (BCA)',
  semester: 'Semester III',
  datesheet: [
    {
      id: 'exam-ds',
      subject: 'Data Structures & Algorithms',
      date: '2026-10-24',
      paperType: 'Theory',
      priority: 'Urgent'
    },
    {
      id: 'exam-os',
      subject: 'Operating Systems & Architecture',
      date: '2026-11-02',
      paperType: 'Theory',
      priority: 'Approaching'
    },
    {
      id: 'exam-db',
      subject: 'Database Management Systems (DBMS)',
      date: '2026-11-12',
      paperType: 'Theory',
      priority: 'Planned'
    },
    {
      id: 'exam-net',
      subject: 'Computer Networks & Internet Protocols',
      date: '2026-11-20',
      paperType: 'Theory',
      priority: 'Planned'
    }
  ],
  doubts: [
    {
      id: 'd-1',
      topicId: 'topic-queue-circ',
      studentName: 'Rahul S. (Roll #14)',
      question: 'Why do some textbooks say Circular Queue size is N-1 when using arrays?',
      answer: 'Great catch! Some implementations sacrifice 1 slot so that FRONT == REAR always strictly means Empty, and (REAR + 1) % N == FRONT strictly means Full. That avoids storing an extra counter variable or full-flag in hardware buffers!',
      createdAt: 'Yesterday at 4:20 PM',
      upvotes: 18
    },
    {
      id: 'd-2',
      topicId: 'topic-deadlock-banker',
      studentName: 'Priya M. (Roll #29)',
      question: 'Can Deadlock happen if there is only 1 single instance of every resource and no cycles in the graph?',
      answer: 'No! If every resource has only 1 single instance, a cycle in the Resource Allocation Graph (RAG) is a NECESSARY and SUFFICIENT condition for deadlock. No cycle = 100% no deadlock guaranteed!',
      createdAt: 'Today at 8:15 AM',
      upvotes: 24
    }
  ],
  cachedLessons: DEFAULT_LESSONS,
  units: [
    {
      id: 'unit-1',
      number: 1,
      title: 'Unit 1: Linear Data Structures',
      topics: [
        {
          id: 'topic-queue-circ',
          unitId: 'unit-1',
          unitTitle: 'Unit 1: Linear Data Structures',
          title: 'Circular Queue vs Linear Queue & Wrap-Around Math',
          difficulty: 'Medium',
          examWeightage: 'Must Read (10 Marks)',
          prerequisites: ['Arrays', 'Basic Queues'],
          estimatedMinutes: 5,
          completed: true,
          masteryScore: 92
        },
        {
          id: 'topic-stack-eval',
          unitId: 'unit-1',
          unitTitle: 'Unit 1: Linear Data Structures',
          title: 'Stack Applications: Infix to Postfix & Expression Evaluation',
          difficulty: 'Medium',
          examWeightage: 'High',
          prerequisites: ['Stack PUSH/POP', 'Operator Precedence'],
          estimatedMinutes: 6,
          completed: false,
          masteryScore: 40
        },
        {
          id: 'topic-linked-list',
          unitId: 'unit-1',
          unitTitle: 'Unit 1: Linear Data Structures',
          title: 'Doubly Linked List Insertion & Deletion Algorithms',
          difficulty: 'Hard',
          examWeightage: 'High',
          prerequisites: ['Pointers', 'Singly Linked List'],
          estimatedMinutes: 7,
          completed: false,
          masteryScore: 0
        }
      ]
    },
    {
      id: 'unit-2',
      number: 2,
      title: 'Unit 2: Operating Systems & Concurrency',
      topics: [
        {
          id: 'topic-deadlock-banker',
          unitId: 'unit-2',
          unitTitle: 'Unit 2: Operating Systems & Concurrency',
          title: 'Deadlock: Coffman Conditions & Banker\'s Avoidance Algorithm',
          difficulty: 'Hard',
          examWeightage: 'Must Read (10 Marks)',
          prerequisites: ['Process Management', 'Resources'],
          estimatedMinutes: 5,
          completed: true,
          masteryScore: 88
        },
        {
          id: 'topic-vm-paging',
          unitId: 'unit-2',
          unitTitle: 'Unit 2: Operating Systems & Concurrency',
          title: 'Virtual Memory, Demand Paging & LRU Page Replacement',
          difficulty: 'Hard',
          examWeightage: 'High',
          prerequisites: ['Main Memory', 'Page Tables'],
          estimatedMinutes: 6,
          completed: false,
          masteryScore: 20
        },
        {
          id: 'topic-cpu-sched',
          unitId: 'unit-2',
          unitTitle: 'Unit 2: Operating Systems & Concurrency',
          title: 'CPU Scheduling: Round Robin with Time Quantum vs SRTF',
          difficulty: 'Medium',
          examWeightage: 'Medium',
          prerequisites: ['Process States', 'Gantt Chart'],
          estimatedMinutes: 5,
          completed: false,
          masteryScore: 60
        }
      ]
    },
    {
      id: 'unit-3',
      number: 3,
      title: 'Unit 3: Relational Database Management Systems',
      topics: [
        {
          id: 'topic-db-norm',
          unitId: 'unit-3',
          unitTitle: 'Unit 3: Relational Database Management Systems',
          title: 'Database Normalization: 1NF, 2NF, 3NF & BCNF with Functional Dependencies',
          difficulty: 'Hard',
          examWeightage: 'Must Read (10 Marks)',
          prerequisites: ['Relational Schema', 'Primary & Candidate Keys'],
          estimatedMinutes: 7,
          completed: false,
          masteryScore: 0
        },
        {
          id: 'topic-db-acid',
          unitId: 'unit-3',
          unitTitle: 'Unit 3: Relational Database Management Systems',
          title: 'ACID Properties & Two-Phase Locking (2PL) Concurrency Protocol',
          difficulty: 'Medium',
          examWeightage: 'High',
          prerequisites: ['Transactions', 'Schedules'],
          estimatedMinutes: 5,
          completed: false,
          masteryScore: 0
        }
      ]
    },
    {
      id: 'unit-4',
      number: 4,
      title: 'Unit 4: Computer Networks & Transport Layer',
      topics: [
        {
          id: 'topic-tcp-udp',
          unitId: 'unit-4',
          unitTitle: 'Unit 4: Computer Networks & Transport Layer',
          title: 'TCP 3-Way Handshake, Flow Control vs UDP Protocol Differences',
          difficulty: 'Medium',
          examWeightage: 'High',
          prerequisites: ['OSI Model', 'Port Numbers'],
          estimatedMinutes: 5,
          completed: false,
          masteryScore: 0
        },
        {
          id: 'topic-subnetting',
          unitId: 'unit-4',
          unitTitle: 'Unit 4: Computer Networks & Transport Layer',
          title: 'IPv4 Classless Addressing (CIDR) & Subnetting Numerical Techniques',
          difficulty: 'Hard',
          examWeightage: 'Must Read (10 Marks)',
          prerequisites: ['Binary Math', 'IP Header'],
          estimatedMinutes: 6,
          completed: false,
          masteryScore: 0
        }
      ]
    }
  ]
};
