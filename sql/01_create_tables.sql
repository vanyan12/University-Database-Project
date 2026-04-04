CREATE TABLE [Students] (
  [student_id] int PRIMARY KEY,
  [first_name] varchar(20) NOT NULL,
  [last_name] varchar(20) NOT NULL,
  [phone_number] varchar(15) NOT NULL,
  [email] varchar(50) UNIQUE,
  [gpa] decimal(4,2),
  [group_id] int NOT NULL
)
GO

CREATE TABLE [Faculty] (
  [faculty_id] int PRIMARY KEY,
  [faculty_name] varchar(100) NOT NULL,
  [dean_prof_id] int NOT NULL
)
GO

CREATE TABLE [Groups] (
  [group_id] int PRIMARY KEY,
  [group_name] varchar(50) NOT NULL,
  [study_year] int,
  [academic_year] int,
  [principal_std_id] int NULL,
  [faculty_id] int NOT NULL
)
GO

CREATE TABLE [Professors] (
  [professor_id] int PRIMARY KEY,
  [first_name] varchar(50),
  [last_name] varchar(50),
  [email] varchar(100) UNIQUE NOT NULL,
  [phone_number] varchar(15),
  [salary] decimal(10,2),
  [chair_id] int
)
GO

CREATE TABLE [Chairs] (
  [chair_id] int PRIMARY KEY,
  [chair_name] varchar(30),
  [head_prof_id] int UNIQUE NOT NULL,
  [faculty_id] int NOT NULL
)
GO

CREATE TABLE [Courses] (
  [course_id] int PRIMARY KEY,
  [course_name] varchar(100) NOT NULL,
  [credits] int NOT NULL,
  [semester] int,
  [faculty_id] int NOT NULL
)
GO

CREATE TABLE [Enrollments] (
  [student_id] int,
  [course_id] int,
  [final_grade] decimal(4,2),
  [status] bit,
  PRIMARY KEY ([student_id], [course_id])
)
GO

CREATE TABLE [Lessons] (
  [lesson_id] int PRIMARY KEY,
  [course_id] int NOT NULL,
  [professor_id] int NOT NULL,
  [group_id] int NOT NULL,
  [lesson_date] date,
  [start_time] time,
  [end_time] time,
  [classroom] varchar(20)
)
GO

CREATE TABLE [Participation] (
  [student_id] int,
  [lesson_id] int,
  [status_id] int NOT NULL,
  [recorded_by] int NOT NULL,
  [recorded_at] datetime,
  [note] varchar(200),
  PRIMARY KEY ([student_id], [lesson_id])
)
GO

CREATE TABLE [Participation_Status] (
  [status_id] int PRIMARY KEY,
  [status_name] varchar(20)
)
GO

CREATE TABLE [Assignments] (
  [assignment_id] int PRIMARY KEY,
  [assignment_name] varchar(100) NOT NULL,
  [assignment_type] varchar(20) NOT NULL,
  [weight_percent] int,
  [due_date] date,
  [max_grade] decimal(5,2) NOT NULL,
  [course_id] int NOT NULL
)
GO

CREATE TABLE [Student_Assignments] (
  [student_id] int,
  [assignment_id] int,
  [grade] decimal(5,2),
  [submission_date] date,
  PRIMARY KEY ([student_id], [assignment_id])
)
GO

CREATE TABLE [Exams] (
  [exam_id] int PRIMARY KEY,
  [student_id] int NOT NULL,
  [course_id] int NOT NULL,
  [exam_date] date,
  [start_time] time,
  [end_time] time,
  [classroom] varchar(20),
  [grade] decimal(4,2)
)
GO

CREATE TABLE [Discount_Types] (
  [discount_type_id] int PRIMARY KEY,
  [discount_type_name] varchar(50) UNIQUE NOT NULL
)
GO

CREATE TABLE [Student_Discounts] (
  [student_id] int NOT NULL,
  [discount_type_id] int NOT NULL,
  [discount_percent] int,
  [start_date] date,
  [end_date] date
  PRIMARY KEY ([student_id], [discount_type_id], [start_date])
)
GO

CREATE TABLE [users] (
  [user_id] int IDENTITY(1,1) PRIMARY KEY,
  [password] varchar(255) NOT NULL,
  [email] varchar(100) UNIQUE NOT NULL,
  [role_id] int NOT NULL,
  [is_active] bit NOT NULL
)
GO

CREATE TABLE [roles] (
  [role_id] int IDENTITY(1,1) PRIMARY KEY,
  [role_name] varchar(50) UNIQUE NOT NULL
)
GO


CREATE UNIQUE INDEX [UQ_Groups_FacultyGroupName] ON [Groups] ("faculty_id", "group_name")
GO

CREATE UNIQUE INDEX [UQ_Lessons_GroupDateStartTime] ON [Lessons] ("group_id", "lesson_date", "start_time")
GO

ALTER TABLE users ADD FOREIGN KEY ([role_id]) REFERENCES roles ([role_id])
GO

ALTER TABLE [Groups] ADD FOREIGN KEY ([faculty_id]) REFERENCES [Faculty] ([faculty_id])
GO

ALTER TABLE [Students] ADD FOREIGN KEY ([group_id]) REFERENCES [Groups] ([group_id])
GO

ALTER TABLE [Professors] ADD FOREIGN KEY ([chair_id]) REFERENCES [Chairs] ([chair_id])
GO

ALTER TABLE [Courses] ADD FOREIGN KEY ([faculty_id]) REFERENCES [Faculty] ([faculty_id])
GO

ALTER TABLE [Enrollments] ADD FOREIGN KEY ([student_id]) REFERENCES [Students] ([student_id])
GO

ALTER TABLE [Enrollments] ADD FOREIGN KEY ([course_id]) REFERENCES [Courses] ([course_id])
GO

ALTER TABLE [Lessons] ADD FOREIGN KEY ([course_id]) REFERENCES [Courses] ([course_id])
GO

ALTER TABLE [Lessons] ADD FOREIGN KEY ([professor_id]) REFERENCES [Professors] ([professor_id])
GO

ALTER TABLE [Lessons] ADD FOREIGN KEY ([group_id]) REFERENCES [Groups] ([group_id])
GO

ALTER TABLE [Participation] ADD FOREIGN KEY ([student_id]) REFERENCES [Students] ([student_id])
GO

ALTER TABLE [Participation] ADD FOREIGN KEY ([lesson_id]) REFERENCES [Lessons] ([lesson_id])
GO

ALTER TABLE [Assignments] ADD FOREIGN KEY ([course_id]) REFERENCES [Courses] ([course_id])
GO

ALTER TABLE [Student_Assignments] ADD FOREIGN KEY ([student_id]) REFERENCES [Students] ([student_id])
GO

ALTER TABLE [Student_Assignments] ADD FOREIGN KEY ([assignment_id]) REFERENCES [Assignments] ([assignment_id])
GO

ALTER TABLE [Exams] ADD FOREIGN KEY ([student_id]) REFERENCES [Students] ([student_id])
GO

ALTER TABLE [Exams] ADD FOREIGN KEY ([course_id]) REFERENCES [Courses] ([course_id])
GO

ALTER TABLE [Participation] ADD FOREIGN KEY ([status_id]) REFERENCES [Participation_Status] ([status_id])
GO

ALTER TABLE [Chairs] ADD FOREIGN KEY ([faculty_id]) REFERENCES [Faculty] ([faculty_id])
GO

ALTER TABLE [Faculty]
ADD FOREIGN KEY ([dean_prof_id]) REFERENCES [Professors] ([professor_id])
GO

ALTER TABLE [Student_Discounts] ADD FOREIGN KEY ([discount_type_id]) REFERENCES [Discount_Types] ([discount_type_id])
GO

ALTER TABLE [Student_Discounts] ADD FOREIGN KEY ([student_id]) REFERENCES [Students] ([student_id])
GO

ALTER TABLE [Chairs] ADD FOREIGN KEY ([head_prof_id]) REFERENCES [Professors] ([professor_id])
GO

ALTER TABLE [Groups]
ADD FOREIGN KEY ([principal_std_id]) REFERENCES [Students] ([student_id])
