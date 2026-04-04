USE [uni]
GO

CREATE VIEW [dbo].[v_user_login] AS
SELECT 
    U.user_id,
    U.email,
    U.password,
    U.is_active,
    R.role_name,
    S.student_id,
    P.professor_id
FROM users U
LEFT JOIN Students S ON U.user_id = S.user_id
LEFT JOIN Professors P ON U.user_id = P.user_id
LEFT JOIN Roles R ON U.role_id = R.role_id
GO


