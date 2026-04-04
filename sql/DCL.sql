CREATE ROLE student_role;
CREATE ROLE professor_role;
CREATE ROLE admin_role;

CREATE LOGIN student_1006 WITH PASSWORD = 'Ufar2026';
CREATE USER std_1006 FOR LOGIN student_1006;

CREATE LOGIN professor_101 WITH PASSWORD = 'Ufar2026';
CREATE USER prof_101 FOR LOGIN professor_101;

CREATE LOGIN admin_001 WITH PASSWORD = 'UfarAdmin2026';
CREATE USER admin_001 FOR LOGIN admin_001;

ALTER ROLE student_role ADD MEMBER std_1006;
ALTER ROLE professor_role ADD MEMBER prof_101;
ALTER ROLE admin_role ADD MEMBER admin_001;

GRANT EXECUTE ON Classmates TO student_role;
GRANT EXECUTE ON My_Courses TO student_role;
GRANT EXECUTE ON My_Assignments TO student_role;
GRANT EXECUTE ON Schedule TO student_role;

GRANT SELECT ON Students TO professor_role;
GRANT SELECT ON Courses TO professor_role;
GRANT SELECT, UPDATE, INSERT ON Exams TO professor_role;

