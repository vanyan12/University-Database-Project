/* ===================================== */
/* Procedure: dbo.Schedule */
/* ===================================== */
CREATE PROCEDURE [dbo].[Schedule]
    @student_id INT
AS
BEGIN
    SELECT 
        C.course_name,
        L.lesson_date,
        L.start_time,
        L.end_time,
        L.classroom
    FROM Lessons AS L
    INNER JOIN Courses AS C 
        ON L.course_id = C.course_id
    INNER JOIN Groups AS G 
        ON L.group_id = G.group_id
    INNER JOIN Students AS S 
        ON G.group_id = S.group_id
    WHERE S.student_id = @student_id;
END;
GO

/* ===================================== */
/* Procedure: dbo.Classmates */
/* ===================================== */
CREATE PROCEDURE [dbo].[Classmates]
    @student_id INT
AS
BEGIN
    DECLARE @group_id INT;

    SELECT @group_id = group_id
    FROM Students
    WHERE student_id = @student_id;

    SELECT 
        S.first_name,
        S.last_name,
        G.group_name
    FROM Students S
    JOIN Groups G 
        ON S.group_id = G.group_id
    WHERE S.group_id = @group_id 
      AND S.student_id <> @student_id;
END;
GO

/* ===================================== */
/* Procedure: dbo.My_Assignments */
/* ===================================== */
CREATE PROCEDURE [dbo].[My_Assignments]
    @student_id INT
AS
BEGIN
    SELECT 
        S.first_name,
        S.last_name,
        A.assignment_name,
        C.course_name,
        A.weight_percent,
        A.max_grade,
        SA.grade,
        SA.submission_date
    FROM Student_Assignments AS SA
    INNER JOIN Students AS S 
        ON SA.student_id = S.student_id
    INNER JOIN Assignments AS A 
        ON SA.assignment_id = A.assignment_id
    INNER JOIN Courses AS C 
        ON A.course_id = C.course_id
    WHERE S.student_id = @student_id
    ORDER BY 
        C.course_name,
        SA.submission_date DESC;
END;
GO

/* ===================================== */
/* Procedure: dbo.My_Courses */
/* ===================================== */
CREATE PROCEDURE [dbo].[My_Courses]
    @student_id INT
AS
BEGIN
    SELECT 
        C.course_name,
        C.credits,
        C.semester,
        E.final_grade,
        CASE 
            WHEN E.status = 1 THEN 'PASSED' 
            ELSE 'FAILED' 
        END AS status
    FROM dbo.Enrollments AS E
    INNER JOIN dbo.Courses AS C 
        ON E.course_id = C.course_id
    WHERE E.student_id = @student_id
    ORDER BY 
        C.semester,
        C.course_name;
END;
GO

/* ===================================== */
/* Procedure: dbo.UpdateStudentGPA */
/* ===================================== */
CREATE PROCEDURE [dbo].[UpdateStudentGPA]
    @student_id INT
AS
BEGIN
    WITH WeightedCourseGrades AS (
        SELECT 
            e.course_id,
            SUM(sa.grade * a.weight_percent / 100.0) AS course_weighted_grade,
            c.credits
        FROM Enrollments e
        JOIN Courses c 
            ON e.course_id = c.course_id
        JOIN Assignments a 
            ON a.course_id = c.course_id
        JOIN Student_Assignments sa 
            ON sa.assignment_id = a.assignment_id
           AND sa.student_id = e.student_id
        WHERE e.student_id = @student_id
        GROUP BY 
            e.course_id,
            c.credits
    )
    UPDATE Students
    SET gpa = (
        SELECT 
            CASE 
                WHEN SUM(credits) = 0 THEN NULL
                ELSE SUM(course_weighted_grade * credits) / SUM(credits)
            END
        FROM WeightedCourseGrades
    )
    WHERE student_id = @student_id;
END;
GO

/* ===================================== */
/* Procedure: dbo.LogAudit */
/* ===================================== */
CREATE PROCEDURE [dbo].[LogAudit]
    @table_name VARCHAR(50),
    @record_id INT,
    @old_value NVARCHAR(MAX) = NULL,
    @new_value NVARCHAR(MAX) = NULL,
    @action_type VARCHAR(10)
AS
BEGIN
    INSERT INTO AuditLog (
        table_name,
        action_type,
        record_id,
        old_value,
        new_value,
        changed_by
    )
    VALUES (
        @table_name,
        @action_type,
        @record_id,
        @old_value,
        @new_value,
        SYSTEM_USER
    );
END;
GO

/* ===================================== */
/* Procedure: dbo.sp_Lessons */
/* ===================================== */
CREATE PROCEDURE [dbo].[sp_Lessons]
    @proffesor_id INT
AS
BEGIN
    SELECT 
        c.course_name,
        g.group_name,
        l.lesson_date,
        l.start_time,
        l.end_time,
        l.classroom
    FROM Lessons l
    JOIN Courses c 
        ON l.course_id = c.course_id
    JOIN Groups g 
        ON l.group_id = g.group_id
    WHERE l.professor_id = @proffesor_id;
END;
GO

/* ===================================== */
/* Procedure: dbo.sp_Participation */
/* ===================================== */
CREATE PROCEDURE [dbo].[sp_Participation]
    @professor_id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT 
        l.lesson_id,
        S.student_id,
        S.first_name,
        S.last_name,
        c.course_name,
        l.lesson_date,
        ps.status_name,
        p.recorded_at
    FROM Participation p
    JOIN Participation_Status ps 
        ON p.status_id = ps.status_id
    JOIN Students S 
        ON p.student_id = S.student_id
    JOIN Lessons l 
        ON p.lesson_id = l.lesson_id
    JOIN Courses c 
        ON c.course_id = l.course_id
    WHERE l.professor_id = @professor_id
    ORDER BY 
        p.recorded_at DESC,
        c.course_name,
        ps.status_name;
END;
GO

/* ===================================== */
/* Procedure: dbo.sp_Courses */
/* ===================================== */
CREATE PROCEDURE [dbo].[sp_Courses]
    @professor_id INT
AS
BEGIN
    SELECT 
        F.faculty_name,
        C.course_name,
        C.semester,
        C.credits
    FROM Courses C
    JOIN Lessons L 
        ON C.course_id = L.course_id
    JOIN Faculty F 
        ON C.faculty_id = F.faculty_id
    WHERE L.professor_id = @professor_id;
END;
GO

/* ===================================== */
/* Procedure: dbo.sp_Assignments */
/* ===================================== */
CREATE PROCEDURE [dbo].[sp_Assignments]
    @professor_id INT
AS
BEGIN
    SELECT  
        a.assignment_id,
        co.course_name,
        a.assignment_name,
        a.assignment_type,
        a.weight_percent,
        a.due_date,
        a.max_grade
    FROM Assignments a
    JOIN Courses co 
        ON a.course_id = co.course_id
    JOIN Get_Courses_By_Professor(@professor_id) c 
        ON a.course_id = c.course_id;
END;
GO

/* ===================================== */
/* Procedure: dbo.sp_Students */
/* ===================================== */
CREATE PROCEDURE [dbo].[sp_Students]
    @professor_id INT
AS
BEGIN
    SELECT 
        S.first_name,
        S.last_name,
        S.email,
        S.phone_number,
        S.gpa
    FROM Students S
    WHERE EXISTS (
        SELECT 1
        FROM Lessons L
        WHERE L.professor_id = @professor_id
          AND L.group_id = S.group_id
    )
    ORDER BY 
        S.last_name,
        S.first_name,
        S.gpa DESC;
END;
GO

/* ===================================== */
/* Procedure: dbo.sp_Exams */
/* ===================================== */
CREATE PROCEDURE [dbo].[sp_Exams]
    @professor_id INT
AS
BEGIN
    SELECT 
        E.student_id,
        C.course_name,
        E.exam_date,
        E.start_time,
        E.end_time,
        E.classroom,
        E.grade
    FROM Exams E
    JOIN Courses C 
        ON E.course_id = C.course_id
    WHERE EXISTS (
        SELECT 1
        FROM Lessons L
        WHERE L.course_id = E.course_id
          AND L.professor_id = @professor_id
    )
    ORDER BY 
        E.course_id,
        E.student_id,
        E.exam_date,
        E.start_time;
END;
GO