-- Trigger after insert or update on Student_Assignments to update GPA for the affected students
CREATE TRIGGER trg_after_grade_insert_SA 
ON Student_Assignments 
AFTER INSERT, UPDATE 
AS 
BEGIN
	SET NOCOUNT ON; 
	
	-- Call UpdateStudentGPA for each distinct student in the inserted rows      
	-- Using a set-based approach with a temporary table      
	DECLARE @StudentList TABLE (student_id INT PRIMARY KEY);        
	
	INSERT INTO @StudentList (student_id)      
	SELECT DISTINCT student_id      
	FROM inserted;        
	
	-- Execute the procedure for each student      
	-- Note: SQL Server doesn't allow direct set-based procedure call,      
	-- so we still need a loop, but over a small in-memory table      
	
	DECLARE @student_id INT;        
	WHILE EXISTS (SELECT 1 FROM @StudentList)      
	BEGIN          
		SELECT TOP 1 @student_id = student_id 
		FROM @StudentList;
		
		EXEC UpdateStudentGPA @student_id;     
		
		DELETE FROM @StudentList WHERE student_id = @student_id;      
	END  
END;

-- Trigger after insert or update on Exams to update GPA for the affected students
CREATE TRIGGER trg_after_grade_insert_exams 
ON Exams 
AFTER INSERT, UPDATE 
AS 
BEGIN
	SET NOCOUNT ON; 
	-- Call UpdateStudentGPA for each distinct student in the inserted rows      
	-- Using a set-based approach with a temporary table      
	DECLARE @StudentList TABLE (student_id INT PRIMARY KEY);
	
	INSERT INTO @StudentList (student_id)      
	SELECT DISTINCT student_id      
	FROM inserted;        
	
	-- Execute the procedure for each student      
	-- Note: SQL Server doesn't allow direct set-based procedure call,      
	-- so we still need a loop, but over a small in-memory table      
	
	DECLARE @student_id INT;        
	WHILE EXISTS (SELECT 1 FROM @StudentList)      
	BEGIN          
		SELECT TOP 1 @student_id = student_id 
		FROM @StudentList;            
		
		EXEC UpdateStudentGPA @student_id;            
		
		DELETE FROM @StudentList WHERE student_id = @student_id;      
	END  
END;


-- Trigger to log changes in Exams table for auditing purposes
CREATE TRIGGER trg_Exams_Audit  
ON Exams  
AFTER INSERT, UPDATE, DELETE  
AS  
BEGIN      
	SET NOCOUNT ON;        
	
	EXEC LogAudit @table_name = 'Exams', @primary_key_name = 'exam_id';  
END;


-- Trigger to log changes in Groups table for auditing purposes
CREATE TRIGGER trg_Group_Audit  
ON Groups  
AFTER INSERT, UPDATE, DELETE  
AS  
BEGIN      
	SET NOCOUNT ON;        
	
	EXEC LogAudit @table_name = 'Groups', @primary_key_name = 'group_id';  
END;



-- Trigger to log changes in Students table for auditing purposes
CREATE   TRIGGER trg_LogAudit_Students  
ON Students  
AFTER INSERT, UPDATE, DELETE  
AS  
BEGIN      
	SET NOCOUNT ON;        
	-- INSERT rows      
	INSERT INTO AuditLog (table_name, action_type, record_id, new_value, changed_by)      
	SELECT          
		'Students',          
		'INSERT',          
		i.student_id,          
		(SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),          
		SYSTEM_USER      
	FROM inserted i      
	LEFT JOIN deleted d ON i.student_id = d.student_id      
	WHERE d.student_id IS NULL;       
	
	-- DELETE rows      
	INSERT INTO AuditLog (table_name, action_type, record_id, old_value, changed_by)      
	SELECT          
		'Students',          
		'DELETE',          
		d.student_id,          
		(SELECT d.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),          
		SYSTEM_USER      
	FROM deleted d      
	LEFT JOIN inserted i ON i.student_id = d.student_id      
	WHERE i.student_id IS NULL;        
	
	
	-- UPDATE rows      
	INSERT INTO AuditLog (table_name, action_type, record_id, old_value, new_value, changed_by)      
	SELECT          
		'Students',          
		'UPDATE',          
		i.student_id,          
		(SELECT d.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),          
		(SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),          
		SYSTEM_USER      
	FROM inserted i      
	JOIN deleted d ON i.student_id = d.student_id;  
END;  