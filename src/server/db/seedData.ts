import {
  ClassWorkspace,
  Subject,
  Unit,
  TimetableClass,
  AcademicMaterial,
  HistoricalPYQ,
  ExamDateSheetItem,
  ClassAnnouncement,
  AppNotification,
  AcademicAssignment,
} from '../../types/index.js';

export const SEED_CLASS: ClassWorkspace = {
  id: 'class-bca-2028',
  code: 'BCA-2028',
  name: 'BCA Batch of 2028',
  university: 'University School of Information Technology',
  semester: 3,
  academicYear: '2026-2027',
  memberCount: 64,
  adminId: 'user-admin-1',
};

export const SEED_SUBJECTS: Subject[] = [
  {
    id: 'sub-java',
    classId: 'class-bca-2028',
    name: 'Java Programming',
    code: 'BCA-301',
    teacherName: 'Prof. Sharma',
    credits: 4,
    color: 'from-amber-500 to-orange-600',
    iconName: 'Coffee',
    totalUnits: 4,
    completedTopicsCount: 8,
    totalTopicsCount: 16,
  },
  {
    id: 'sub-dbms',
    classId: 'class-bca-2028',
    name: 'Database Management Systems',
    code: 'BCA-302',
    teacherName: 'Dr. Neha Verma',
    credits: 4,
    color: 'from-blue-500 to-cyan-600',
    iconName: 'Database',
    totalUnits: 4,
    completedTopicsCount: 10,
    totalTopicsCount: 18,
  },
  {
    id: 'sub-web',
    classId: 'class-bca-2028',
    name: 'Web Development',
    code: 'BCA-303',
    teacherName: 'Prof. Ankit Mehra',
    credits: 3,
    color: 'from-slate-700 to-zinc-700',
    iconName: 'Globe',
    totalUnits: 4,
    completedTopicsCount: 6,
    totalTopicsCount: 14,
  },
  {
    id: 'sub-os',
    classId: 'class-bca-2028',
    name: 'Operating Systems',
    code: 'BCA-304',
    teacherName: 'Dr. K.R. Rao',
    credits: 4,
    color: 'from-purple-500 to-indigo-600',
    iconName: 'Cpu',
    totalUnits: 4,
    completedTopicsCount: 7,
    totalTopicsCount: 16,
  },
  {
    id: 'sub-cn',
    classId: 'class-bca-2028',
    name: 'Computer Networks',
    code: 'BCA-305',
    teacherName: 'Prof. Sunita Rao',
    credits: 3,
    color: 'from-rose-500 to-pink-600',
    iconName: 'Network',
    totalUnits: 4,
    completedTopicsCount: 4,
    totalTopicsCount: 15,
  },
];

export const SEED_UNITS: Record<string, Unit[]> = {
  'sub-dbms': [
    {
      id: 'unit-dbms-1',
      subjectId: 'sub-dbms',
      number: 1,
      title: 'Unit 1: Relational Model & ER Design',
      topics: [
        {
          id: 'topic-dbms-er',
          unitId: 'unit-dbms-1',
          subjectId: 'sub-dbms',
          title: 'Entity-Relationship (ER) Diagrams & Weak Entities',
          order: 1,
          difficulty: 'Medium',
          examWeightage: 'High',
          estimatedMinutes: 6,
          status: 'strong',
        },
        {
          id: 'topic-dbms-relalg',
          unitId: 'unit-dbms-1',
          subjectId: 'sub-dbms',
          title: 'Relational Algebra: Select, Project, Join & Set Operations',
          order: 2,
          difficulty: 'Hard',
          examWeightage: 'Must Read (10 Marks)',
          estimatedMinutes: 7,
          status: 'revised',
        },
      ],
    },
    {
      id: 'unit-dbms-2',
      subjectId: 'sub-dbms',
      number: 2,
      title: 'Unit 2: Normalization & Functional Dependencies',
      topics: [
        {
          id: 'topic-dbms-fd',
          unitId: 'unit-dbms-2',
          subjectId: 'sub-dbms',
          title: 'Functional Dependencies & Closure of Attribute Sets',
          order: 1,
          difficulty: 'Medium',
          examWeightage: 'High',
          estimatedMinutes: 5,
          status: 'revised',
        },
        {
          id: 'topic-dbms-norm',
          unitId: 'unit-dbms-2',
          subjectId: 'sub-dbms',
          title: 'Normalization: 1NF, 2NF, 3NF & Boyce-Codd (BCNF)',
          order: 2,
          difficulty: 'Hard',
          examWeightage: 'Must Read (10 Marks)',
          estimatedMinutes: 8,
          status: 'strong',
        },
      ],
    },
    {
      id: 'unit-dbms-3',
      subjectId: 'sub-dbms',
      number: 3,
      title: 'Unit 3: Transaction Processing & Concurrency',
      topics: [
        {
          id: 'topic-dbms-acid',
          unitId: 'unit-dbms-3',
          subjectId: 'sub-dbms',
          title: 'ACID Properties & Transaction State Diagram',
          order: 1,
          difficulty: 'Medium',
          examWeightage: 'Must Read (10 Marks)',
          estimatedMinutes: 5,
          status: 'learning',
        },
        {
          id: 'topic-dbms-2pl',
          unitId: 'unit-dbms-3',
          subjectId: 'sub-dbms',
          title: 'Two-Phase Locking (2PL) Protocol & Serializability',
          order: 2,
          difficulty: 'Hard',
          examWeightage: 'High',
          estimatedMinutes: 6,
          status: 'not_started',
        },
      ],
    },
  ],
  'sub-java': [
    {
      id: 'unit-java-1',
      subjectId: 'sub-java',
      number: 1,
      title: 'Unit 1: OOP Paradigms & JVM Architecture',
      topics: [
        {
          id: 'topic-java-jvm',
          unitId: 'unit-java-1',
          subjectId: 'sub-java',
          title: 'JVM, JRE, JDK & Bytecode Execution Mechanism',
          order: 1,
          difficulty: 'Easy',
          examWeightage: 'Medium',
          estimatedMinutes: 4,
          status: 'strong',
        },
        {
          id: 'topic-java-classes',
          unitId: 'unit-java-1',
          subjectId: 'sub-java',
          title: 'Classes, Objects, Constructors & this Keyword',
          order: 2,
          difficulty: 'Easy',
          examWeightage: 'High',
          estimatedMinutes: 5,
          status: 'strong',
        },
      ],
    },
    {
      id: 'unit-java-2',
      subjectId: 'sub-java',
      number: 2,
      title: 'Unit 2: Inheritance, Polymorphism & Interfaces',
      topics: [
        {
          id: 'topic-java-inheritance',
          unitId: 'unit-java-2',
          subjectId: 'sub-java',
          title: 'Inheritance: Types, super Keyword & Method Overriding',
          order: 1,
          difficulty: 'Medium',
          examWeightage: 'Must Read (10 Marks)',
          estimatedMinutes: 6,
          status: 'learning',
        },
        {
          id: 'topic-java-interfaces',
          unitId: 'unit-java-2',
          subjectId: 'sub-java',
          title: 'Abstract Classes vs Interfaces & Multiple Inheritance',
          order: 2,
          difficulty: 'Hard',
          examWeightage: 'Must Read (10 Marks)',
          estimatedMinutes: 7,
          status: 'not_started',
        },
      ],
    },
  ],
  'sub-os': [
    {
      id: 'unit-os-1',
      subjectId: 'sub-os',
      number: 1,
      title: 'Unit 1: Process Scheduling & Concurrency',
      topics: [
        {
          id: 'topic-os-sched',
          unitId: 'unit-os-1',
          subjectId: 'sub-os',
          title: 'CPU Scheduling: Round Robin with Time Quantum vs SRTF',
          order: 1,
          difficulty: 'Medium',
          examWeightage: 'Must Read (10 Marks)',
          estimatedMinutes: 6,
          status: 'revised',
        },
        {
          id: 'topic-os-deadlock',
          unitId: 'unit-os-1',
          subjectId: 'sub-os',
          title: 'Deadlock: 4 Coffman Conditions & Banker Avoidance Algorithm',
          order: 2,
          difficulty: 'Hard',
          examWeightage: 'Must Read (10 Marks)',
          estimatedMinutes: 7,
          status: 'weak',
        },
      ],
    },
  ],
};

export const SEED_TIMETABLE: TimetableClass[] = [
  // Today's classes
  {
    id: 'tt-1',
    day: 'Wednesday',
    time: '09:30 AM - 10:30 AM',
    subjectId: 'sub-dbms',
    subjectName: 'Database Management Systems',
    subjectCode: 'BCA-302',
    room: 'Lab 3 (Ground Floor)',
    teacherName: 'Dr. Neha Verma',
    likelyTopic: {
      id: 'topic-dbms-acid',
      title: 'ACID Properties & Transaction Schedules',
      confidence: 88,
      reasoning: 'Follows Unit 2 Normalization completed yesterday; matches syllabus timetable sequence.',
    },
  },
  {
    id: 'tt-2',
    day: 'Wednesday',
    time: '11:00 AM - 12:00 PM',
    subjectId: 'sub-os',
    subjectName: 'Operating Systems',
    subjectCode: 'BCA-304',
    room: 'Room 304',
    teacherName: 'Dr. K.R. Rao',
    likelyTopic: {
      id: 'topic-os-deadlock',
      title: "Banker's Algorithm Numerical Problems",
      confidence: 82,
      reasoning: "Deadlock theory was covered in previous lecture; numericals are next in teacher's syllabus plan.",
    },
  },
  {
    id: 'tt-3',
    day: 'Wednesday',
    time: '01:30 PM - 02:30 PM',
    subjectId: 'sub-web',
    subjectName: 'Web Development',
    subjectCode: 'BCA-303',
    room: 'Software Lab 1',
    teacherName: 'Prof. Ankit Mehra',
    likelyTopic: {
      id: 'topic-web-dom',
      title: 'DOM Manipulation & Event Listeners in JavaScript',
      confidence: 76,
      reasoning: 'Matches JavaScript module progress in class syllabus.',
    },
  },
  // Tomorrow's classes
  {
    id: 'tt-4',
    day: 'Thursday',
    time: '10:00 AM - 11:00 AM',
    subjectId: 'sub-java',
    subjectName: 'Java Programming',
    subjectCode: 'BCA-301',
    room: 'Room 204',
    teacherName: 'Prof. Sharma',
    likelyTopic: {
      id: 'topic-java-inheritance',
      title: 'Inheritance: Super Keyword & Method Overriding',
      confidence: 91,
      reasoning: 'Constructors were finalized Tuesday; Unit 2 begins with Inheritance.',
    },
  },
  {
    id: 'tt-5',
    day: 'Thursday',
    time: '11:30 AM - 12:30 PM',
    subjectId: 'sub-cn',
    subjectName: 'Computer Networks',
    subjectCode: 'BCA-305',
    room: 'Room 208',
    teacherName: 'Prof. Sunita Rao',
    likelyTopic: {
      id: 'topic-cn-osi',
      title: 'Transport Layer: TCP 3-Way Handshake vs UDP',
      confidence: 85,
      reasoning: 'Network Layer IP routing concluded last week.',
    },
  },
];

export const SEED_MATERIALS: AcademicMaterial[] = [
  {
    id: 'mat-1',
    classId: 'class-bca-2028',
    subjectId: 'sub-dbms',
    subjectName: 'Database Management Systems',
    topicId: 'topic-dbms-norm',
    topicTitle: 'Normalization (1NF, 2NF, 3NF, BCNF)',
    title: 'Unit 2 Official Teacher PPT - Normalization & FD.pdf',
    fileName: 'DBMS_Unit2_Normalization_Verma.pdf',
    fileType: 'pdf',
    fileSize: '4.2 MB',
    uploaderName: 'Dr. Neha Verma (Faculty)',
    uploaderRole: 'teacher',
    verificationStatus: 'teacher_verified',
    createdAt: 'Yesterday, 3:45 PM',
    resources: {
      summary:
        'Comprehensive breakdown of functional dependencies, insertion/deletion/update anomalies, and step-by-step table decomposition into 1NF, 2NF, 3NF, and BCNF without information loss.',
      hinglishSummary:
        'Simple words mein: Normalization database tables ko aise split karta hai taaki duplicate data (redundancy) khatam ho jaye aur insert/update ke time anomalies na aayein. Exam mein 1NF, 2NF, 3NF, BCNF ke conditions aur candidate key checks par 10 marks ka pakka numerical aata hai!',
      mindmapMermaid: `graph TD\n  A[Normalization] --> B[1NF: Atomic Values]\n  A --> C[2NF: No Partial Dependency]\n  A --> D[3NF: No Transitive Dependency]\n  A --> E[BCNF: Determinant is Candidate Key]`,
      keyConcepts: [
        {
          concept: 'Candidate Key Check',
          explanation:
            'A minimal superkey capable of uniquely identifying every tuple in a relation.',
        },
        {
          concept: 'Lossless Join Decomposition',
          explanation:
            'Ensures that recombining decomposed tables using natural join yields the exact original relation without spurious tuples.',
        },
      ],
      importantDefinitions: [
        {
          term: 'Functional Dependency (X -> Y)',
          definition:
            'A constraint between two attributes where value of X uniquely determines the value of Y.',
        },
        {
          term: 'Boyce-Codd Normal Form (BCNF)',
          definition:
            'A relation is in BCNF if for every functional dependency X -> Y, X is a strict superkey.',
        },
      ],
      examples: [
        {
          title: 'Student Course Enrollment Anomaly',
          scenario:
            'Storing StudentName, CourseID, and CourseFee in a single table duplicates CourseFee for every student enrolled in that course.',
          takeaway:
            'Splitting into StudentEnrollment(StudentID, CourseID) and Courses(CourseID, CourseFee) eliminates update anomalies.',
        },
      ],
      examPoints: [
        'Always find the candidate key using attribute closure before attempting normal form classification.',
        'State explicitly whether a decomposition is both Lossless and Dependency Preserving.',
      ],
      mnemonics: [
        {
          term: 'Normalization Hierarchy (1NF to BCNF)',
          acronym: 'A-P-T-S',
          mnemonic: 'All Prime Turbines Spin (Atomic, Partial, Transitive, Superkey)',
          explanation: '1NF requires Atomic values; 2NF eliminates Partial dependencies; 3NF eliminates Transitive dependencies; BCNF requires left-side to be a Superkey.',
        },
      ],
      exam10Marker: {
        question: 'Explain Database Normalization from 1NF to BCNF with functional dependency proofs and anomalous decomposition examples.',
        answerStructure: '1. Definition & Need for Normalization (2 Marks)\n2. 1NF, 2NF, 3NF & BCNF Invariants (4 Marks)\n3. Numerical Decomposition Proof (3 Marks)\n4. Lossless Join vs Dependency Preservation Matrix (1 Mark)',
        modelAnswerMarkdown: `### 1. Introduction & Objectives of Normalization\nNormalization is a formal database design technique that decomposes complex relations to eliminate redundant data and avoid Insert, Update, and Delete anomalies.\n\n### 2. Normal Forms Hierarchy\n- **First Normal Form (1NF)**: Every cell contains only atomic (indivisible) values. No multi-valued or composite attributes.\n- **Second Normal Form (2NF)**: Must be in 1NF, and all non-prime attributes must be fully functionally dependent on candidate keys (No partial dependencies).\n- **Third Normal Form (3NF)**: Must be in 2NF, and no non-prime attribute should transitively depend on the primary key.\n- **Boyce-Codd Normal Form (BCNF)**: Stricter version of 3NF. For every FD X -> Y, X must strictly be a Superkey.\n\n### 3. Step-by-Step Numerical Example\nGiven relation R(StudentID, CourseID, Professor, Office):\n- FDs: {StudentID, CourseID} -> Professor; Professor -> Office.\n- Candidate Key: {StudentID, CourseID}.\n- Decompose into R1(StudentID, CourseID, Professor) and R2(Professor, Office).\n- Result: Lossless and satisfies BCNF.\n\n### 4. University Evaluator Advice\nAlways draw the dependency arrow diagrams and write the attribute closures (e.g. {X}+) before writing the decomposition tables.`,
        keyDiagramText: 'Dependency Diagram: {StudentID, CourseID} -> Professor; Professor -> Office (Transitive Dependency highlighted)',
      },
      flashcards: [
        {
          id: 'fc-1',
          question: 'What eliminates Partial Dependency?',
          answer: 'Second Normal Form (2NF). Every non-prime attribute must fully depend on candidate key.',
        },
        {
          id: 'fc-2',
          question: 'What is the condition for BCNF?',
          answer: 'For every functional dependency X -> Y, X must be a superkey.',
        },
      ],
      quiz: [
        {
          id: 'q-1',
          question: 'In relation R(A, B, C) with candidate key AB, the dependency B -> C violates:',
          options: ['1NF', '2NF', '3NF only', 'BCNF only'],
          correctIndex: 1,
          explanation:
            'C is non-prime and depends on B, which is part of candidate key AB. This is a partial dependency, violating 2NF.',
        },
      ],
      possibleQuestions: [
        {
          marks: 10,
          question:
            'Given R(A,B,C,D,E) with F={A->B, BC->D, E->A}. Find candidate keys and highest normal form.',
          answerOutline:
            '1. Calculate closures. 2. Identify candidate keys (BC, CE). 3. Test each FD against 2NF, 3NF, BCNF rules.',
        },
      ],
      relatedPYQs: [
        { year: 2025, marks: 10, question: 'Explain BCNF with a real-life example where 3NF is not in BCNF.' },
        { year: 2024, marks: 10, question: 'Differentiate 3NF and BCNF with dependency preservation test.' },
        { year: 2022, marks: 5, question: 'Define transitive dependency with relational example.' },
        { year: 2021, marks: 10, question: 'Decompose given relational schema into 3NF step by step.' },
      ],
    },
  },
  {
    id: 'mat-2',
    classId: 'class-bca-2028',
    subjectId: 'sub-java',
    subjectName: 'Core Java Programming',
    topicId: 'topic-java-inheritance',
    topicTitle: 'Inheritance & Method Overriding',
    unitNumber: 2,
    unitTitle: 'Unit 2: Inheritance, Polymorphism & Interfaces',
    folderPath: 'Core Java Programming / Unit 2 - Inheritance & Interfaces / NOTES',
    detectedCategory: 'notes',
    title: 'Unit 2 OOPs Inheritance Notes & Code Snippets.pdf',
    fileName: 'Java_Unit2_Inheritance_Shared.pdf',
    fileType: 'pdf',
    fileSize: '2.8 MB',
    uploaderName: 'Aman Kumar (Class Representative)',
    uploaderRole: 'student',
    verificationStatus: 'student_shared',
    createdAt: '2 days ago',
    resources: {
      summary:
        'Class notes detailing single, multilevel, and hierarchical inheritance in Java. Details why multiple inheritance is disallowed with classes (Diamond problem) and how interfaces solve it.',
      hinglishSummary:
        'Inheritance ka matlab code reuse karna. Parent class ke methods aur properties child class use kar sakti hai. Java mein `extends` keyword use hota hai. Multiple inheritance classes ke through allow nahi hoti taaki Diamond Problem na aaye, par Interfaces se hum ise achieve karte hain.',
      mindmapMermaid: `graph TD\n  A[Inheritance in Java] --> B[Single Inheritance]\n  A --> C[Multilevel Inheritance]\n  A --> D[Hierarchical Inheritance]\n  A --> E[Multiple: Disallowed for Classes, Allowed via Interfaces]`,
      mnemonics: [
        {
          term: 'OOPs 4 Pillars',
          acronym: 'A-P-I-E',
          mnemonic: 'A Piece of Indian Earth (Abstraction, Polymorphism, Inheritance, Encapsulation)',
          explanation: 'Standard foundational mnemonic for any university Java examination.',
        },
      ],
      exam10Marker: {
        question: 'Differentiate Method Overloading and Method Overriding with suitable Java programs and dynamic method dispatch illustration.',
        answerStructure: '1. Comparison Table: Overloading vs Overriding (4 Marks)\n2. Working Java Program for Overriding with super() (3 Marks)\n3. Dynamic Method Dispatch & Runtime Polymorphism (2 Marks)\n4. Diamond Problem Resolution via Interfaces (1 Mark)',
        modelAnswerMarkdown: `### 1. Conceptual Distinction\n- **Method Overloading**: Compile-time polymorphism occurring in the same class with identical method names but differing argument lists.\n- **Method Overriding**: Runtime polymorphism occurring between Superclass and Subclass with identical method name, parameter list, and return type.\n\n### 2. Java Code Illustration\n\`\`\`java\nclass Bank {\n    double getInterestRate() { return 5.0; }\n}\nclass HDFC extends Bank {\n    @Override\n    double getInterestRate() { return 7.5; }\n}\n\`\`\`\n\n### 3. Dynamic Method Dispatch\nWhen a superclass reference variable refers to a subclass object, Java determines which version of an overridden method to call at runtime based on the object type, not the reference type.`,
        keyDiagramText: 'Inheritance Tree Diagram: Bank (Base) <- HDFC (Child overrides getInterestRate())',
      },
      keyConcepts: [
        { concept: 'super keyword', explanation: 'Invokes parent constructor or overridden parent methods.' },
        { concept: 'Diamond Problem', explanation: 'Ambiguity when two parent classes implement the same method.' },
      ],
      importantDefinitions: [
        {
          term: 'Method Overriding',
          definition: 'Child class providing specific implementation for method already defined in parent with identical signature.',
        },
      ],
      examples: [
        {
          title: 'Vehicle Hierarchy',
          scenario: 'Vehicle class with startEngine(); Car extends Vehicle and overrides startEngine() with ignition protocol.',
          takeaway: 'Promotes code reusability and dynamic method dispatch.',
        },
      ],
      examPoints: ['Write working Java syntax for `super()` call as the first line of subclass constructor.'],
      flashcards: [
        { id: 'fc-j1', question: 'Why does Java not support multiple inheritance with classes?', answer: 'To avoid the diamond ambiguity problem.' },
      ],
      quiz: [
        {
          id: 'q-j1',
          question: 'Can private members of a superclass be inherited by a subclass?',
          options: ['Yes, always', 'No, private members are not inherited', 'Only if protected', 'Only in same package'],
          correctIndex: 1,
          explanation: 'Private members are strictly encapsulated within their declaring class.',
        },
      ],
      possibleQuestions: [
        { marks: 10, question: 'Explain Method Overloading vs Method Overriding with code examples and dynamic binding.', answerOutline: 'Compare signatures, binding time (compile vs runtime), and write Car/Vehicle code.' },
      ],
      relatedPYQs: [
        { year: 2024, marks: 10, question: 'Explain dynamic method dispatch in Java with a complete program.' },
        { year: 2023, marks: 5, question: 'What is the role of super keyword in constructor chaining?' },
      ],
    },
  },
  {
    id: 'mat-3',
    classId: 'class-bca-2028',
    subjectId: 'sub-os',
    subjectName: 'Operating Systems',
    topicId: 'topic-os-deadlocks',
    topicTitle: 'Deadlocks & Process Synchronization',
    unitNumber: 3,
    unitTitle: 'Unit 3: Deadlocks & Synchronization',
    folderPath: 'Operating Systems / Unit 3 - Deadlocks & Synchronization / NOTES',
    detectedCategory: 'notes',
    title: 'Unit 3 Deadlock Coffman Conditions & Banker Algorithm.pdf',
    fileName: 'OS_Unit3_Deadlocks_Coffman.pdf',
    fileType: 'pdf',
    fileSize: '3.1 MB',
    uploaderName: 'Prof. Rajesh Sharma (Faculty)',
    uploaderRole: 'teacher',
    verificationStatus: 'teacher_verified',
    createdAt: '3 days ago',
    resources: {
      summary:
        'Detailed analysis of the 4 Coffman conditions for deadlocks, Resource Allocation Graphs (RAG), and Banker Algorithm for deadlock avoidance.',
      hinglishSummary:
        'Deadlock tab hota hai jab processes ek dusre ke resources hold karke wait kar rahe hote hain. Iske 4 mandatory conditions hain (MHNC). Banker\'s Algorithm se OS check karta hai ki state safe hai ya nahi.',
      mindmapMermaid: `graph TD\n  A[Deadlocks] --> B[4 Coffman Conditions: MHNC]\n  A --> C[Deadlock Prevention]\n  A --> D[Deadlock Avoidance: Banker Algorithm]\n  A --> E[Deadlock Detection & Recovery]`,
      mnemonics: [
        {
          term: 'The 4 Coffman Conditions',
          acronym: 'M-H-N-C',
          mnemonic: 'Must Have No Circularity (Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait)',
          explanation: 'All 4 conditions must hold simultaneously for a deadlock to exist.',
        },
      ],
      exam10Marker: {
        question: 'Explain the 4 Necessary Conditions for Deadlock (Coffman Conditions). Describe Banker\'s Algorithm with Safe State mathematical proof.',
        answerStructure: '1. Formal Definition & Coffman Conditions (4 Marks)\n2. Resource Allocation Graph (RAG) with Cycle Example (2 Marks)\n3. Banker\'s Algorithm Data Structures (Allocation, Max, Available, Need) (3 Marks)\n4. Recovery Strategies (1 Mark)',
        modelAnswerMarkdown: `### 1. The Four Coffman Conditions (1971)\nA deadlock can arise if and only if all four conditions hold concurrently in the system:\n1. **Mutual Exclusion**: At least one resource must be non-shareable.\n2. **Hold and Wait**: A process holds at least one resource and is waiting for others.\n3. **No Preemption**: Resources cannot be forcibly seized; only released voluntarily.\n4. **Circular Wait**: A closed chain P0 -> P1 -> ... -> Pn -> P0 exists where each waits for a resource held by the next.\n\n### 2. Banker's Algorithm Data Structures\n- \`Available[m]\`: Free instances of resource types.\n- \`Max[n][m]\`: Maximum demand of process \`i\`.\n- \`Allocation[n][m]\`: Currently held instances.\n- \`Need[n][m] = Max[n][m] - Allocation[n][m]\`.\n\n### 3. Safety Algorithm Proof\nFind an index \`i\` such that \`Finish[i] == false\` and \`Need[i] <= Work\`. Update \`Work = Work + Allocation[i]\` and \`Finish[i] = true\`. Repeat until all processes finish. If all processes finish, state is SAFE.`,
        keyDiagramText: 'Resource Allocation Graph: P1 -> R1 -> P2 -> R2 -> P1 (Closed Cycle implies deadlock)',
      },
      keyConcepts: [
        { concept: 'Safe State Invariant', explanation: 'System can allocate resources to each process in some sequence without deadlocking.' },
        { concept: 'Resource Allocation Graph', explanation: 'Directed graph where cycles indicate deadlocks in single-instance systems.' },
      ],
      importantDefinitions: [
        {
          term: 'Deadlock',
          definition: 'A state in which every process in a set is waiting for an event that only another process in the set can cause.',
        },
      ],
      examples: [
        {
          title: 'Single Lane Bridge Anomaly',
          scenario: 'Two cars meet head-on on a single-lane bridge. Neither can move forward without the other backing up.',
          takeaway: 'Starvation and deadlock resolved only by preemption (one car backs up).',
        },
      ],
      examPoints: ['Always compute the Need Matrix: Need = Max - Allocation before starting the algorithm steps.'],
      flashcards: [
        { id: 'fc-os1', question: 'Which Coffman condition is broken by spooling?', answer: 'Mutual Exclusion (spooling allows virtual concurrency for non-shareable printers).' },
      ],
      quiz: [
        {
          id: 'q-os1',
          question: 'Which of the following is NOT one of the 4 Coffman conditions for deadlocks?',
          options: ['Mutual Exclusion', 'Hold and Wait', 'Aging Priority', 'Circular Wait'],
          correctIndex: 2,
          explanation: 'Aging is a scheduling technique to prevent starvation, not a Coffman condition.',
        },
      ],
      possibleQuestions: [
        { marks: 10, question: 'Given a resource matrix with 5 processes and 3 resources, determine if the system is in a safe state using Banker Algorithm.', answerOutline: 'Compute Need matrix -> Apply safety test -> Print safe sequence.' },
      ],
      relatedPYQs: [
        { year: 2024, marks: 10, question: 'State Coffman conditions and solve given Banker Algorithm numerical.' },
      ],
    },
  },
];

export const SEED_PYQS: HistoricalPYQ[] = [
  {
    id: 'pyq-1',
    subjectId: 'sub-dbms',
    subjectName: 'Database Management Systems',
    unitNumber: 2,
    topicTitle: 'Normalization (1NF, 2NF, 3NF, BCNF)',
    year: 2025,
    marks: 10,
    question: 'Define Boyce-Codd Normal Form (BCNF). How does it differ from 3NF? Explain with a relational schema where 3NF holds but BCNF is violated.',
    modelAnswer: '1. State formal 3NF definition (no transitive dependency). 2. State BCNF definition (for all X->Y, X must be superkey). 3. Provide schema R(Student, Subject, Teacher) where Teacher->Subject and (Student, Subject) is key. Show that it is in 3NF but not BCNF.',
    source: 'University End-Term Paper Dec 2025',
    difficulty: 'Hard',
    isVerifiedHistorical: true,
    frequencyCount: 4,
  },
  {
    id: 'pyq-2',
    subjectId: 'sub-dbms',
    subjectName: 'Database Management Systems',
    unitNumber: 2,
    topicTitle: 'Normalization (1NF, 2NF, 3NF, BCNF)',
    year: 2024,
    marks: 10,
    question: 'What is functional dependency? Explain 1NF, 2NF, and 3NF with suitable student database examples.',
    modelAnswer: 'Provide precise definition of FD. Walk through unnormalized tables with repeating groups to 1NF (atomic values), 2NF (remove partial dependencies), and 3NF (remove transitive dependencies).',
    source: 'University End-Term Paper May 2024',
    difficulty: 'Medium',
    isVerifiedHistorical: true,
    frequencyCount: 4,
  },
  {
    id: 'pyq-3',
    subjectId: 'sub-dbms',
    subjectName: 'Database Management Systems',
    unitNumber: 3,
    topicTitle: 'ACID Properties of Transactions',
    year: 2024,
    marks: 10,
    question: 'Explain the ACID properties of a database transaction. How does the DBMS ensure Atomicity and Durability during system crashes?',
    modelAnswer: 'Atomicity (All-or-Nothing via undo logging/WAL), Consistency (Integrity constraints), Isolation (Concurrency control/locking), Durability (Redo logging in non-volatile storage). Draw state diagram.',
    source: 'University End-Term Paper Dec 2024',
    difficulty: 'Medium',
    isVerifiedHistorical: true,
    frequencyCount: 3,
  },
  {
    id: 'pyq-4',
    subjectId: 'sub-java',
    subjectName: 'Java Programming',
    unitNumber: 2,
    topicTitle: 'Inheritance & Dynamic Binding',
    year: 2024,
    marks: 10,
    question: 'What is dynamic method dispatch? Explain how run-time polymorphism is achieved in Java using inheritance and abstract classes.',
    modelAnswer: 'Dynamic method dispatch is the mechanism by which a call to an overridden method is resolved at runtime rather than compile time. Demonstrate with Figure base class and Rectangle/Triangle subclasses overriding area().',
    source: 'BCA Semester III Exam 2024',
    difficulty: 'Medium',
    isVerifiedHistorical: true,
    frequencyCount: 3,
  },
  {
    id: 'pyq-5',
    subjectId: 'sub-os',
    subjectName: 'Operating Systems',
    unitNumber: 1,
    topicTitle: 'Deadlocks & Banker Algorithm',
    year: 2024,
    marks: 10,
    question: "Explain the four necessary Coffman conditions for Deadlock. Explain Dijkstra's Banker's Algorithm with a 5-process, 3-resource numerical problem.",
    modelAnswer: 'State Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait. Calculate Need matrix = Max - Allocation. Trace Work = Available and produce safe sequence <P1, P3, P4, P0, P2>.',
    source: 'University End-Term Paper Dec 2024',
    difficulty: 'Hard',
    isVerifiedHistorical: true,
    frequencyCount: 4,
  },
];

export const SEED_EXAMS: ExamDateSheetItem[] = [
  {
    id: 'exam-1',
    classId: 'class-bca-2028',
    subjectId: 'sub-dbms',
    subjectName: 'Database Management Systems',
    date: '2026-11-14',
    time: '10:00 AM - 01:00 PM',
    examType: 'End-Term',
    priority: 'High Priority',
    revisionDaysPlan: [
      { dayNumber: 1, title: 'ER Diagrams & Relational Algebra', topics: ['ER Diagrams', 'Relational Algebra Operations'], completed: true },
      { dayNumber: 2, title: 'Functional Dependencies & Normalization', topics: ['1NF, 2NF, 3NF', 'BCNF Decomposition'], completed: false },
      { dayNumber: 3, title: 'ACID Properties & Concurrency Protocols', topics: ['ACID Model', 'Two-Phase Locking (2PL)'], completed: false },
      { dayNumber: 4, title: 'Past 5 Years PYQ Solving', topics: ['2021-2025 University 10-Markers'], completed: false },
      { dayNumber: 5, title: 'Full Mock Test & Formula Sheet', topics: ['Timed 3-Hour Paper', 'Quick Revision Sheet'], completed: false },
    ],
  },
  {
    id: 'exam-2',
    classId: 'class-bca-2028',
    subjectId: 'sub-java',
    subjectName: 'Java Programming',
    date: '2026-11-20',
    time: '10:00 AM - 01:00 PM',
    examType: 'End-Term',
    priority: 'Medium Priority',
    revisionDaysPlan: [
      { dayNumber: 1, title: 'JVM Architecture & Basics', topics: ['JVM Internals', 'Constructors'], completed: false },
      { dayNumber: 2, title: 'Inheritance & Interfaces', topics: ['Dynamic Dispatch', 'Multiple Inheritance'], completed: false },
      { dayNumber: 3, title: 'Exception Handling & Multithreading', topics: ['try-catch-finally', 'Thread Lifecycle'], completed: false },
      { dayNumber: 4, title: 'Java Collections Framework', topics: ['ArrayList vs LinkedList', 'HashMap'], completed: false },
    ],
  },
  {
    id: 'exam-3',
    classId: 'class-bca-2028',
    subjectId: 'sub-os',
    subjectName: 'Operating Systems',
    date: '2026-11-26',
    time: '10:00 AM - 01:00 PM',
    examType: 'End-Term',
    priority: 'Medium Priority',
    revisionDaysPlan: [
      { dayNumber: 1, title: 'CPU Scheduling Algorithms', topics: ['Round Robin', 'Shortest Job First'], completed: false },
      { dayNumber: 2, title: 'Deadlock & Memory Paging', topics: ["Banker's Algorithm", 'Virtual Memory Demand Paging'], completed: false },
    ],
  },
];

export const SEED_ANNOUNCEMENTS: ClassAnnouncement[] = [
  {
    id: 'ann-1',
    classId: 'class-bca-2028',
    authorName: 'Dr. Neha Verma',
    authorRole: 'teacher',
    title: 'DBMS Minor Lab Assignment Due Friday',
    content: 'Please submit your ER diagram and 3NF normalization writeup before 5:00 PM on Friday. The PPT and practice questions have been uploaded to our class repository.',
    createdAt: 'Today, 08:30 AM',
    badge: 'Teacher Notice',
  },
  {
    id: 'ann-2',
    classId: 'class-bca-2028',
    authorName: 'Aman Kumar (CR)',
    authorRole: 'student',
    title: 'Java Lab Room Relocation for Tomorrow',
    content: 'Tomorrow morning Java practical session will be held in Room 204 instead of Software Lab 2 due to maintenance.',
    createdAt: 'Yesterday, 06:15 PM',
    badge: 'Class Update',
  },
];

export const SEED_ASSIGNMENTS: AcademicAssignment[] = [
  {
    id: 'assign-1',
    classId: 'class-bca-2028',
    subjectId: 'sub-dbms',
    subjectName: 'Database Management Systems',
    type: 'assignment',
    title: 'Hospital Management System: ER Diagram & Normalization to 3NF',
    dueDate: '2026-10-17',
    instructions:
      'Design an ER diagram with at least 5 entities including Doctors, Patients, Appointments, and Bills. Normalize the tables to 3NF and prove no partial dependencies exist.',
    integrityMode: 'teach_me',
    assignedBy: 'Dr. Rajesh Sharma',
    completed: false,
    outlineSteps: [
      'Step 1: Identify real-world entities and relationship cardinalities (1:M, M:N)',
      'Step 2: Convert ER diagram into relational schemas with primary and foreign keys',
      'Step 3: Test functional dependencies and demonstrate 2NF and 3NF decomposition',
      'Step 4: Provide sample SQL DDL statements (CREATE TABLE with foreign key constraints)',
    ],
    keyReferences: [
      'Silberschatz, Korth, Sudarshan - Database System Concepts (Chapter 2 & 7)',
      'Dr. Verma Class PPT Unit 2 Normalization',
    ],
    sampleDraftGuidance:
      'Focus on explaining WHY the decomposition prevents insertion and deletion anomalies rather than just listing tables.',
    solution: `# 💡 Full-Credit Academic Solution: Hospital Management ER & 3NF Normalization

## 🎓 1. Executive Summary & Problem Formulation
In university database systems, un-normalized relational schemas cause severe data redundancy and update/deletion anomalies. This solution presents the formal functional dependency analysis and progressive schema normalization from 1NF to 3NF.

## 📐 2. Functional Dependencies (FDs)
Given un-normalized relation R(PatientID, PatientName, DoctorID, DoctorName, Department, RoomNo, BillAmount):
1. PatientID → PatientName, RoomNo
2. DoctorID → DoctorName, Department
3. (PatientID, DoctorID) → BillAmount

## 📝 3. Step-by-Step 3NF Decomposition
* **1NF:** Ensure all attributes are atomic and no repeating groups exist.
* **2NF:** Eliminate partial dependencies. All non-key attributes must be fully functionally dependent on candidate key (PatientID, DoctorID).
* **3NF:** Eliminate transitive dependencies (DoctorID → Department).

### Decomposed Relational Schemas:
\`\`\`sql
CREATE TABLE Doctors (
    DoctorID VARCHAR(20) PRIMARY KEY,
    DoctorName VARCHAR(100) NOT NULL,
    Department VARCHAR(50) NOT NULL
);

CREATE TABLE Patients (
    PatientID VARCHAR(20) PRIMARY KEY,
    PatientName VARCHAR(100) NOT NULL,
    RoomNo INT NOT NULL
);

CREATE TABLE Appointments (
    AppointmentID VARCHAR(20) PRIMARY KEY,
    PatientID VARCHAR(20) NOT NULL,
    DoctorID VARCHAR(20) NOT NULL,
    BillAmount DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID)
);
\`\`\`

## 📚 4. Academic References:
Silberschatz, Korth, Sudarshan - Database System Concepts (Chapter 7 Normalization).`,
    aiSolvedAnswer: `# 💡 Full-Credit Academic Solution: Hospital Management ER & 3NF Normalization

## 🎓 1. Executive Summary & Problem Formulation
In university database systems, un-normalized relational schemas cause severe data redundancy and update/deletion anomalies. This solution presents the formal functional dependency analysis and progressive schema normalization from 1NF to 3NF.

## 📐 2. Functional Dependencies (FDs)
Given un-normalized relation R(PatientID, PatientName, DoctorID, DoctorName, Department, RoomNo, BillAmount):
1. PatientID → PatientName, RoomNo
2. DoctorID → DoctorName, Department
3. (PatientID, DoctorID) → BillAmount

## 📝 3. Step-by-Step 3NF Decomposition
* **1NF:** Ensure all attributes are atomic and no repeating groups exist.
* **2NF:** Eliminate partial dependencies. All non-key attributes must be fully functionally dependent on candidate key (PatientID, DoctorID).
* **3NF:** Eliminate transitive dependencies (DoctorID → Department).

### Decomposed Relational Schemas:
\`\`\`sql
CREATE TABLE Doctors (
    DoctorID VARCHAR(20) PRIMARY KEY,
    DoctorName VARCHAR(100) NOT NULL,
    Department VARCHAR(50) NOT NULL
);

CREATE TABLE Patients (
    PatientID VARCHAR(20) PRIMARY KEY,
    PatientName VARCHAR(100) NOT NULL,
    RoomNo INT NOT NULL
);

CREATE TABLE Appointments (
    AppointmentID VARCHAR(20) PRIMARY KEY,
    PatientID VARCHAR(20) NOT NULL,
    DoctorID VARCHAR(20) NOT NULL,
    BillAmount DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (PatientID) REFERENCES Patients(PatientID),
    FOREIGN KEY (DoctorID) REFERENCES Doctors(DoctorID)
);
\`\`\`

## 📚 4. Academic References:
Silberschatz, Korth, Sudarshan - Database System Concepts (Chapter 7 Normalization).`,
    solvedBy: 'Faculty Verified Model Solution',
    solvedAt: '2026-10-17T09:00:00.000Z',
  },
  {
    id: 'assign-2',
    classId: 'class-bca-2028',
    subjectId: 'sub-java',
    subjectName: 'Java Programming',
    type: 'assignment',
    title: 'Producer-Consumer Problem using synchronized and wait/notify',
    dueDate: '2026-10-20',
    instructions:
      'Implement thread synchronization in Java for a bounded buffer producer-consumer model. Handle buffer overflow and underflow conditions using wait() and notifyAll().',
    integrityMode: 'teach_me',
    assignedBy: 'Prof. Ananya Sen',
    completed: false,
    outlineSteps: [
      'Step 1: Define BoundedBuffer class with shared queue and capacity',
      'Step 2: Implement synchronized produce() and consume() methods with wait()',
      'Step 3: Create Producer and Consumer Runnable worker threads',
      'Step 4: Demonstrate deadlock-free execution in main driver method',
    ],
    keyReferences: ['Herbert Schildt - Java: The Complete Reference (Chapter 11 Multi-threading)'],
    sampleDraftGuidance: 'Always put wait() inside a while-loop condition to handle spurious wakeups.',
    solution: `# ☕ Thread Synchronization: Bounded-Buffer Producer-Consumer in Java

## 🎓 1. Theoretical Architecture & Synchronization Invariants
The classical Bounded-Buffer Producer-Consumer model requires:
1. **Mutual exclusion:** Only one worker thread accesses the shared buffer queue at a time.
2. **Underflow prevention:** Consumer thread waits when buffer is empty (\`queue.isEmpty()\`).
3. **Overflow prevention:** Producer thread waits when buffer reaches capacity (\`queue.size() == capacity\`).
4. **Spurious Wakeup Prevention:** The condition check MUST be inside a \`while\` loop, never an \`if\` statement.

## 💻 2. Production Java Implementation
\`\`\`java
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
        notifyAll();
    }

    public synchronized T consume() throws InterruptedException {
        while (queue.isEmpty()) {
            wait();
        }
        T item = queue.poll();
        System.out.println("[CONSUMED]: " + item + " (Remaining: " + queue.size() + ")");
        notifyAll();
        return item;
    }
}
\`\`\`

## 📚 3. Academic References:
Herbert Schildt - Java: The Complete Reference (Chapter 11 Multi-threaded Programming).`,
    aiSolvedAnswer: `# ☕ Thread Synchronization: Bounded-Buffer Producer-Consumer in Java

## 🎓 1. Theoretical Architecture & Synchronization Invariants
The classical Bounded-Buffer Producer-Consumer model requires:
1. **Mutual exclusion:** Only one worker thread accesses the shared buffer queue at a time.
2. **Underflow prevention:** Consumer thread waits when buffer is empty (\`queue.isEmpty()\`).
3. **Overflow prevention:** Producer thread waits when buffer reaches capacity (\`queue.size() == capacity\`).
4. **Spurious Wakeup Prevention:** The condition check MUST be inside a \`while\` loop, never an \`if\` statement.

## 💻 2. Production Java Implementation
\`\`\`java
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
        notifyAll();
    }

    public synchronized T consume() throws InterruptedException {
        while (queue.isEmpty()) {
            wait();
        }
        T item = queue.poll();
        System.out.println("[CONSUMED]: " + item + " (Remaining: " + queue.size() + ")");
        notifyAll();
        return item;
    }
}
\`\`\`

## 📚 3. Academic References:
Herbert Schildt - Java: The Complete Reference (Chapter 11 Multi-threaded Programming).`,
    solvedBy: 'Faculty Verified Model Solution',
    solvedAt: '2026-10-17T09:00:00.000Z',
  },
  {
    id: 'ppt-1',
    classId: 'class-bca-2028',
    subjectId: 'sub-os',
    subjectName: 'Operating Systems',
    type: 'ppt_presentation',
    title: 'Class Presentation: Deadlock Avoidance using Banker\'s Algorithm & Safety State Matrix',
    dueDate: '2026-10-22',
    presenterName: 'Roll 101 - Aman Kumar & Team',
    rollNumber: 'BCA-01 to BCA-05',
    instructions:
      'Prepare a 10-slide PowerPoint presentation with visual dry-run on 5 processes (P0-P4) and 3 resource types (A, B, C). Explain Need Matrix, Allocation Matrix, and Safe Sequence determination.',
    integrityMode: 'teach_me',
    assignedBy: 'Class Representative (CR) / Faculty Schedule',
    completed: false,
    outlineSteps: [
      'Slide 1-2: What is Deadlock & Coffman Conditions',
      'Slide 3-5: Banker\'s Algorithm Data Structures (Available, Max, Allocation, Need)',
      'Slide 6-8: Step-by-Step Trace of Safety Algorithm with numerical example',
      'Slide 9-10: Resource Request Algorithm & Real-world OS comparison',
    ],
    keyReferences: ['Galvin, Silberschatz - Operating System Concepts (Chapter 8 Deadlocks)'],
    sampleDraftGuidance: 'Highlight that Banker\'s algorithm requires knowing maximum resource requests in advance, which is its main practical drawback.',
    solution: `# 🖥️ Deadlock Avoidance: Banker's Algorithm Numerical Matrix Trace

## 🎓 1. System State Definition
Consider a system with 5 Processes (\`P0, P1, P2, P3, P4\`) and 3 Resource Types (\`A: 10, B: 5, C: 7\`).

### Snapshot at Time T0:
* **Available Vector:** \`[3, 3, 2]\`
* **Need Matrix Calculation:** \`Need[i][j] = Max[i][j] - Allocation[i][j]\`

| Process | Allocation (A B C) | Max (A B C) | Need (A B C) |
| :-: | :-: | :-: | :-: |
| **P0** | 0 1 0 | 7 5 3 | 7 4 3 |
| **P1** | 2 0 0 | 3 2 2 | 1 2 2 |
| **P2** | 3 0 2 | 9 0 2 | 6 0 0 |
| **P3** | 2 1 1 | 2 2 2 | 0 1 1 |
| **P4** | 0 0 2 | 4 3 3 | 4 3 1 |

## 🔍 2. Safety Algorithm Step-by-Step Trace:
1. **Check P1:** Need \`[1, 2, 2] <= Available [3, 3, 2]\` -> **TRUE**.  
   *P1 executes.* \`New Available = [3, 3, 2] + Allocation[2, 0, 0] = [5, 3, 2]\`.
2. **Check P3:** Need \`[0, 1, 1] <= Available [5, 3, 2]\` -> **TRUE**.  
   *P3 executes.* \`New Available = [5, 3, 2] + Allocation[2, 1, 1] = [7, 4, 3]\`.
3. **Check P4:** Need \`[4, 3, 1] <= Available [7, 4, 3]\` -> **TRUE**.  
   *P4 executes.* \`New Available = [7, 4, 3] + Allocation[0, 0, 2] = [7, 4, 5]\`.
4. **Check P0:** Need \`[7, 4, 3] <= Available [7, 4, 5]\` -> **TRUE**.  
   *P0 executes.* \`New Available = [7, 4, 5] + Allocation[0, 1, 0] = [7, 5, 5]\`.
5. **Check P2:** Need \`[6, 0, 0] <= Available [7, 5, 5]\` -> **TRUE**.  
   *P2 executes.* \`New Available = [7, 5, 5] + Allocation[3, 0, 2] = [10, 5, 7]\`.

**Result:** The system is in a **SAFE STATE** with Safe Execution Sequence:  
\`<P1, P3, P4, P0, P2>\``,
    aiSolvedAnswer: `# 🖥️ Deadlock Avoidance: Banker's Algorithm Numerical Matrix Trace

## 🎓 1. System State Definition
Consider a system with 5 Processes (\`P0, P1, P2, P3, P4\`) and 3 Resource Types (\`A: 10, B: 5, C: 7\`).

### Snapshot at Time T0:
* **Available Vector:** \`[3, 3, 2]\`
* **Need Matrix Calculation:** \`Need[i][j] = Max[i][j] - Allocation[i][j]\`

| Process | Allocation (A B C) | Max (A B C) | Need (A B C) |
| :-: | :-: | :-: | :-: |
| **P0** | 0 1 0 | 7 5 3 | 7 4 3 |
| **P1** | 2 0 0 | 3 2 2 | 1 2 2 |
| **P2** | 3 0 2 | 9 0 2 | 6 0 0 |
| **P3** | 2 1 1 | 2 2 2 | 0 1 1 |
| **P4** | 0 0 2 | 4 3 3 | 4 3 1 |

## 🔍 2. Safety Algorithm Step-by-Step Trace:
1. **Check P1:** Need \`[1, 2, 2] <= Available [3, 3, 2]\` -> **TRUE**.  
   *P1 executes.* \`New Available = [3, 3, 2] + Allocation[2, 0, 0] = [5, 3, 2]\`.
2. **Check P3:** Need \`[0, 1, 1] <= Available [5, 3, 2]\` -> **TRUE**.  
   *P3 executes.* \`New Available = [5, 3, 2] + Allocation[2, 1, 1] = [7, 4, 3]\`.
3. **Check P4:** Need \`[4, 3, 1] <= Available [7, 4, 3]\` -> **TRUE**.  
   *P4 executes.* \`New Available = [7, 4, 3] + Allocation[0, 0, 2] = [7, 4, 5]\`.
4. **Check P0:** Need \`[7, 4, 3] <= Available [7, 4, 5]\` -> **TRUE**.  
   *P0 executes.* \`New Available = [7, 4, 5] + Allocation[0, 1, 0] = [7, 5, 5]\`.
5. **Check P2:** Need \`[6, 0, 0] <= Available [7, 5, 5]\` -> **TRUE**.  
   *P2 executes.* \`New Available = [7, 5, 5] + Allocation[3, 0, 2] = [10, 5, 7]\`.

**Result:** The system is in a **SAFE STATE** with Safe Execution Sequence:  
\`<P1, P3, P4, P0, P2>\``,
    solvedBy: 'Faculty Verified Model Solution',
    solvedAt: '2026-10-17T09:00:00.000Z',
  },
  {
    id: 'ppt-2',
    classId: 'class-bca-2028',
    subjectId: 'sub-dbms',
    subjectName: 'Database Management Systems',
    type: 'ppt_presentation',
    title: 'Class Presentation: B-Tree vs B+ Tree Indexing in High-Throughput Databases',
    dueDate: '2026-10-24',
    presenterName: 'Roll 106 - Priya Singh & Team',
    rollNumber: 'BCA-06 to BCA-10',
    instructions:
      'Explain balanced multi-way tree structures, differences between B-Tree and B+ Tree (leaves linked as linked-list for range queries), and performance in disk I/O.',
    integrityMode: 'teach_me',
    assignedBy: 'Class Representative (CR) / Faculty Schedule',
    completed: false,
    outlineSteps: [
      'Slide 1-3: Linear vs Index file scan disk I/O costs',
      'Slide 4-6: B+ Tree internal node structure vs leaf node storage',
      'Slide 7-8: Insert & Split operations with trace',
      'Slide 9-10: Why MySQL InnoDB and PostgreSQL default to B+ Tree indexes',
    ],
    keyReferences: ['Database System Concepts Chapter 14 Indexing & Hashing'],
    sampleDraftGuidance: 'Emphasize that all data records/pointers are stored exclusively at the leaf level in B+ trees, allowing higher fan-out in internal nodes.',
  },
];

export const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: "Prepare for Tomorrow's Java Class",
    message: "Prof. Sharma will cover Inheritance & super keyword in Room 204 tomorrow at 10:00 AM. Complete your 7-minute prep!",
    type: 'prep_reminder',
    time: '20 mins ago',
    read: false,
    actionUrl: '/tomorrow',
  },
  {
    id: 'notif-2',
    title: 'New Teacher PPT Uploaded',
    message: 'Dr. Neha Verma uploaded "DBMS Unit 2 Normalization & FD.pdf" (Teacher Verified).',
    type: 'material_uploaded',
    time: '3 hours ago',
    read: false,
    actionUrl: '/materials',
  },
  {
    id: 'notif-3',
    title: 'DBMS End-Term Exam in 37 Days',
    message: 'Normalization and ACID properties have been flagged as High Priority topics for your revision plan.',
    type: 'exam_alert',
    time: '1 day ago',
    read: false,
    actionUrl: '/exams',
  },
];
