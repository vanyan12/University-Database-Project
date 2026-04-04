---- 1) Get a list of all students in the database.
--SELECT * FROM Students;

---- 2) Retrieve all students along with their group names
--SELECT S.first_name, S.last_name, G.group_name
--FROM Students S
--JOIN Groups G ON S.group_id = G.group_id;

------ 3) List all courses along with their faculty names.
--SELECT C.course_name, F.faculty_name
--FROM Courses C
--JOIN Faculty F ON C.faculty_id = F.faculty_id;

------ 4) Retrieve students and their enrolled courses with final grades
--SELECT S.first_name, S.last_name, C.course_name, E.final_grade
--FROM Courses C
--JOIN Enrollments E ON E.course_id = C.course_id
--JOIN Students S ON S.student_id = E.student_id



---- 5) Find all lessons conducted by a specific professor.
--SELECT L.lesson_id, L.lesson_date, L.start_time, L.end_time, L.classroom
--FROM Lessons L
--WHERE L.professor_id = 101;

------- 6) Retrieve all assignments for a specific course, ordered by due date.
--SELECT * 
--FROM Assignments A
--WHERE A.course_id = 202
--ORDER BY A.due_date;

------- 7) Show all students who have submitted assignments late
--SELECT S.student_id, S.first_name, S.last_name, A.assignment_name, A.due_date, SA.submission_date
--FROM Students S
--JOIN Student_Assignments SA ON S.student_id = SA.student_id
--JOIN Assignments A ON SA.assignment_id = A.assignment_id
--WHERE SA.submission_date > A.due_date;

------- 8) Retrieve all students with active discounts
--SELECT S.student_id, S.first_name, S.last_name, Sd.discount_percent, Sd.start_date, Sd.end_date
--FROM Students S
--JOIN Student_Discounts Sd ON Sd.student_id = S.student_id
--WHERE GETDATE() BETWEEN Sd.start_date AND Sd.end_date;


------- 9) List all exams taken by a student with course names and grades
--SELECT S.first_name, S.last_name, C.course_name, E.exam_date, E.grade
--FROM Students S
--JOIN Exams E ON S.student_id = E.student_id
--JOIN Courses C ON E.course_id = C.course_id
--WHERE S.student_id = 1012;

--------- 10) Find all students who are not assigned to any group
--SELECT S.first_name, S.last_name
--FROM Students S
--LEFT JOIN Groups G ON S.group_id = G.group_id
--WHERE G.group_id IS NULL;


-------- 11) Calculate the average GPA per group and display groups with average GPA > 3 (GROUP BY + HAVING)
--SELECT AVG(S.gpa) AS average_gpa, G.group_name, G.academic_year 
--FROM Students S
--JOIN Groups G ON G.group_id = S.group_id
--GROUP BY G.group_name
--HAVING AVG(S.gpa) > 3;


--------- 16) Find the top 5 students with the highest GPA.
--SELECT TOP 5 * 
--FROM Students
--ORDER BY gpa DESC;


--------- 17) Retrieve courses with the number of enrolled students in each course
--SELECT C.course_name, COUNT(E.student_id) AS Students_Count
--FROM Courses C
--LEFT JOIN Enrollments E ON C.course_id = E.course_id
--GROUP BY C.course_name;


----------- 18) Find students who are enrolled in more than 8 courses.
--SELECT D.first_name, D.last_name
--FROM (
--	SELECT S.student_id, S.first_name, S.last_name, Count(E.student_id) AS Course_cnt
--	FROM Students S
--	JOIN Enrollments E ON S.student_id = E.student_id
--	GROUP BY S.student_id, S.first_name, S.last_name
--) AS D
--WHERE D.Course_cnt > 8;



------------ 19) Retrieve the professor who teaches the most lessons.
--SELECT 
--	first_name, 
--	last_name, 
--	lesson_count
--FROM (
--	SELECT 
--		P.professor_id,
--		P.first_name, 
--		P.last_name,
--		COUNT (L.lesson_id) as lesson_count,
--		RANK () OVER (ORDER BY COUNT (L.lesson_id) DESC) AS r
--	FROM Professors P
--	JOIN Lessons L ON L.professor_id = P.professor_id
--	GROUP BY P.professor_id, P.first_name, P.last_name
--) AS RankedProfessors
--WHERE r = 1;



--------------- 20) Find students who have never submitted any assignment
--SELECT
--	S.student_id, S.first_name, S.last_name
--FROM Students S
--LEFT JOIN Student_Assignments SA ON S.student_id = SA.student_id
--WHERE SA.assignment_id IS NULL;


---------------- 21) Retrieve the highest grade for each course from Exams. (GROUP BY + MAX)
--SELECT C.course_name, MAX(E.grade) AS highest_grade
--FROM Exams E
--JOIN Courses C ON E.course_id = C.course_id
--GROUP BY C.course_name;


----------------- 22) Find students whose GPA is above the average GPA of all students. (Subquery)
--SELECT S.first_name, S.last_name, S.gpa
--FROM Students S
--WHERE S.gpa > (SELECT AVG(gpa) FROM Students);


------------------ 23) Find overlapping lessons in the same classroom (time conflicts).
--SELECT *
--FROM Lessons L1
--JOIN Lessons L2 ON L1.classroom = L2.classroom
--AND L1.lesson_id <> L2.lesson_id
--AND L1.lesson_id < L2.lesson_id
--AND L1.lesson_date = L2.lesson_date
--AND (
--	(L1.start_time < L2.end_time AND L1.end_time > L2.start_time)
--);


------------------- 24) Retrieve students with attendance percentage below 80%.
--SELECT 
--	S.first_name, 
--	S.last_name, 
--	CAST(SUM(CASE WHEN P.status_id = 1 OR P.status_id = 4 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(P.lesson_id) * 100 AS attendance_percentage
--FROM Students S
--JOIN Participation P ON S.student_id = P.student_id
--GROUP BY S.student_id, S.first_name, S.last_name
--HAVING CAST(SUM(CASE WHEN P.status_id = 1 OR P.status_id = 4 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(P.lesson_id) * 100 < 80;


---------------------- 25) Rank students within each group based on GPA.
--SELECT *, DENSE_RANK() OVER (PARTITION BY group_id ORDER BY gpa DESC) AS gpa_rank
--FROM Students S


-------------------- 26) Find the most common participation status per student
--WITH RankedParticipation AS (
--	SELECT 
--		S.student_id,
--		S.first_name,
--		S.last_name,
--		P.status_id, 
--		COUNT(*) AS status_count,
--		RANK() OVER (PARTITION BY S.student_id ORDER BY COUNT(*) DESC) AS r
--	FROM Students S
--	JOIN Participation P ON S.student_id = P.student_id
--	GROUP BY S.student_id, S.first_name, S.last_name, P.status_id
--)

--SELECT *
--FROM RankedParticipation
--WHERE r = 1;











