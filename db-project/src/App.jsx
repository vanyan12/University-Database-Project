import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import './App.css'
import {
  DataGrid,
  GridRowModes,
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { DashboardLayout, ThemeSwitcher } from '@toolpad/core/DashboardLayout';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { PageContainer } from '@toolpad/core/PageContainer';
import { Account } from '@toolpad/core/Account';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { createTheme } from '@mui/material/styles';
import SchoolIcon from '@mui/icons-material/School';
import SignInSide from './sign-in-side/SignInSide.jsx';

const DEFAULT_STATUS_OPTIONS = ['Present', 'Absent', 'Excused', 'Late'];


const customTheme = createTheme({
  cssVariables: {
    // Remove or comment out colorSchemeSelector to disable mode switching
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          light: 'hsl(210, 100%, 92%)',
          main: 'hsl(210, 98%, 42%)',
          dark: 'hsl(210, 100%, 35%)',
          contrastText: '#ffffff',
        },
        secondary: {
          main: 'hsl(220, 20%, 35%)',
        },
        background: {
          default: 'hsl(0, 0%, 99%)',
          paper: 'hsl(220, 35%, 97%)',
        },
        text: {
          primary: 'hsl(220, 30%, 6%)',
          secondary: 'hsl(220, 20%, 35%)',
        },
        divider: 'hsla(220, 20%, 80%, 0.55)',
        warning: {
          main: 'hsl(45, 90%, 40%)',
        },
      },
    },
    dark: {
      palette: {
        primary: {
          light: 'hsl(214, 55%, 82%)',
          main: 'hsl(216, 44%, 72%)',
          dark: 'hsl(216, 38%, 58%)',
          contrastText: 'hsl(220, 35%, 8%)',
        },
        secondary: {
          main: 'hsl(217, 36%, 70%)',
        },
        background: {
          default: 'hsl(216, 55%, 8%)',
          paper: 'hsl(216, 46%, 10%)',
        },
        text: {
          primary: '#ffffff',
          secondary: 'hsl(217, 35%, 68%)',
        },
        divider: 'hsla(216, 28%, 28%, 0.72)',
        warning: {
          main: 'hsl(45, 90%, 40%)',
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 600,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiSvgIcon: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.secondary,
        }),
      },
    },
  },
});

const formatTableName = (name) => {
  const withSpaces = name.replaceAll('_', ' ').replace('sp', '').trim();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

const normalizeDateTimeDisplay = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  const isoMatch = trimmedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/,
  );

  if (!isoMatch) {
    return value;
  }

  const [, year, month, day, hours, minutes, seconds] = isoMatch;
  return `${year}-${month}-${day} ${hours}:${minutes}${seconds ? `:${seconds}` : ''}`;
};

const formatGridDateTimeValue = (paramsOrValue) => {
  if (paramsOrValue != null && typeof paramsOrValue === 'object' && 'value' in paramsOrValue) {
    return normalizeDateTimeDisplay(paramsOrValue.value);
  }

  return normalizeDateTimeDisplay(paramsOrValue);
};

function GridLoadingOverlay() {
  return (
    <Box
      sx={{
        alignItems: 'center',
        backdropFilter: 'blur(2px)',
        backgroundColor: 'rgba(255, 255, 255, 0.32)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        height: '100%',
        justifyContent: 'center',
        px: 3,
      }}
    >
      <Skeleton variant="rounded" animation="wave" width="92%" height={38} />
      <Skeleton variant="rounded" animation="wave" width="88%" height={38} />
      <Skeleton variant="rounded" animation="wave" width="90%" height={38} />
      <Skeleton variant="rounded" animation="wave" width="85%" height={38} />
    </Box>
  );
}

function HeaderThemeSwitcher() {
  return (
    <Box
      sx={{
        '& .MuiIconButton-root': {
          borderRadius: 999,
        },
        ...customTheme.applyStyles('dark', {
          '& .MuiIconButton-root': {
            color: 'hsl(220, 35%, 8%)',
            backgroundColor: 'hsl(220, 30%, 96%)',
            boxShadow: '0 10px 28px rgba(3, 8, 20, 0.4)',
            '&:hover': {
              backgroundColor: 'hsl(220, 24%, 90%)',
            },
          },
        }),
      }}
    >
      <ThemeSwitcher />
    </Box>
  );
}


function App() {

  const location = useLocation();
  const navigate = useNavigate();

  const [navigation, setNavigation] = useState([]);
  const [gridRows, setGridRows] = useState([]);
  const [baseColumns, setBaseColumns] = useState([]);
  const [rowIdField, setRowIdField] = useState('id');
  const [dbRowIdField, setDbRowIdField] = useState('id');
  const [rowModesModel, setRowModesModel] = useState({});
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isRowMutating, setIsRowMutating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUS_OPTIONS);
  const canModifyRows = ['prof', 'professor'].includes((currentRole || '').toLowerCase());

  const selectedTable = useMemo(() => {
    const [firstSegment = ''] = location.pathname.split('/').filter(Boolean);

    if (!firstSegment) {
      return '';
    }

    try {
      return decodeURIComponent(firstSegment);
    } catch {
      return firstSegment;
    }
  }, [location.pathname]);

  const writeTableName = useMemo(() => {
    const tableName = selectedTable || '';
    const normalizedTableName = tableName.toLowerCase();

    if (normalizedTableName === 'sp_participation' || normalizedTableName === 'sp_participations') {
      return 'Participation';
    }

    if (normalizedTableName.startsWith('sp_')) {
      return tableName.slice(3);
    }

    return tableName;
  }, [selectedTable]);

  const canShowTableActions = useMemo(() => {
    const normalizedTableName = (selectedTable || '')
      .replace(/^sp_/i, '')
      .replace(/^my_/i, '')
      .toLowerCase();

    return normalizedTableName === 'participation' || normalizedTableName === 'participations';
  }, [selectedTable]);

  const isAssignmentsTable = useMemo(() => {
    const normalizedTableName = (selectedTable || '')
      .replace(/^sp_/i, '')
      .replace(/^my_/i, '')
      .toLowerCase();

    return normalizedTableName === 'assignment' || normalizedTableName === 'assignments';
  }, [selectedTable]);

  const isParticipationTable = useMemo(() => {
    return (writeTableName || '').toLowerCase() === 'participation';
  }, [writeTableName]);

  const canAddRowsForSelectedTable = canModifyRows && isAssignmentsTable;

  const canEditRowsForSelectedTable = canModifyRows && canShowTableActions;

  const gridColumns = useMemo(() => {
    return baseColumns.filter((column) => column.field);
  }, [baseColumns]);

  const getRowIdentity = (row) => row?.__rowKey ?? row?.[rowIdField] ?? row?.id;
  
  const getDbRowIdentity = (row) => {
    // Try the detected dbRowIdField first
    if (dbRowIdField && row?.[dbRowIdField] != null) {
      return row[dbRowIdField];
    }
    
    // Try common ID field patterns as fallbacks
    const candidateFields = ['assignment_id', 'course_id', 'student_id', 'lesson_id', 'id'];
    for (const field of candidateFields) {
      if (row?.[field] != null && row[field] !== '') {
        return row[field];
      }
    }
    
    // Last resort
    return null;
  };

  const authFetch = (url, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  useEffect(() => {
    if (!isAuthenticated || !authToken) {
      return;
    }

    authFetch('http://localhost:8000/api/status-options')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Status options request failed with ${response.status}`);
        }

        return response.json();
      })
      .then((data) => {
        const options = (data.options || [])
          .map((option) => option?.status_name)
          .filter((option) => typeof option === 'string' && option.trim().length > 0);

        if (options.length > 0) {
          setStatusOptions(options);
        }
      })
      .catch((error) => {
        console.warn('Unable to load status options, using defaults:', error);
      });
  }, [isAuthenticated, authToken]);

  const handleAddClick = async () => {
    const timestamp = Date.now();
    const numericDbIds = gridRows
      .map((row) => Number(row?.[rowIdField]))
      .filter((value) => Number.isFinite(value));
    const nextDbId = numericDbIds.length > 0 ? Math.max(...numericDbIds) + 1 : 1;

    const editableFields = gridColumns
      .filter((column) => column?.field && column.field !== 'id')
      .map((column) => column.field);

    const newRow = {
      id: timestamp,
      __rowKey: `new-${timestamp}`,
      isNew: true,
      __writeTableName: selectedTable || writeTableName,
    };

    if (rowIdField && rowIdField !== 'id' && rowIdField !== '__rowKey') {
      newRow[rowIdField] = nextDbId;
    }

    editableFields.forEach((field) => {
      if (field === rowIdField && newRow[field] != null) {
        return;
      }
      newRow[field] = '';
    });

    setGridRows((previousRows) => [...previousRows, newRow]);

    const firstField = editableFields[0];
    const rowEditId = getRowIdentity(newRow);
    setRowModesModel((previousModel) => ({
      ...previousModel,
      [rowEditId]: firstField
        ? { mode: GridRowModes.Edit, fieldToFocus: firstField }
        : { mode: GridRowModes.Edit },
    }));
  };

  const resolveCourseIdFromName = async (courseName) => {
    const normalizedCourseName = String(courseName || '').trim().toLowerCase();
    if (!normalizedCourseName) {
      throw new Error('course_name is required to resolve course_id');
    }

    const response = await authFetch(
      `http://localhost:8000/api/course-id?course_name=${encodeURIComponent(normalizedCourseName)}`,
    );
    if (!response.ok) {
      throw new Error(`Unable to resolve course_id (status ${response.status})`);
    }

    const data = await response.json();
    if (data?.course_id == null || data?.course_id === '') {
      throw new Error(`Unable to resolve course_id for course_name: ${courseName}`);
    }

    return data.course_id;
  };

  const processRowUpdate = async (newRow, oldRow) => {
    setIsRowMutating(true);
    try {
      const targetWriteTableName = newRow?.__writeTableName ?? oldRow?.__writeTableName ?? selectedTable ?? writeTableName;

      const fieldsToExclude = new Set(['id', 'isNew']);
      if (!newRow.isNew) {
        fieldsToExclude.add(rowIdField);
        fieldsToExclude.add(dbRowIdField);
      }

      let filteredFields = Object.entries(newRow).filter(([field, value]) => {
        if (fieldsToExclude.has(field) || field.startsWith('__')) {
          return false;
        }

        if (newRow.isNew) {
          return true;
        }

        const previousValue = oldRow?.[field];
        return String(previousValue ?? '') !== String(value ?? '');
      });

      // For Participation table, only allow status_name updates
      const normalizedTableName = String(targetWriteTableName)
            .replace(/^sp_/i, '')
            .trim()
            .toLowerCase();
      if (normalizedTableName.includes('participation')) {
        filteredFields = filteredFields.filter(([field]) => field.toLowerCase() === 'status_name');
      }

      const payload = Object.fromEntries(filteredFields);

      if (newRow.isNew && normalizedTableName.includes('assignment')) {
        const hasCourseId = payload.course_id != null && String(payload.course_id).trim() !== '';
        const hasCourseName = typeof payload.course_name === 'string' && payload.course_name.trim().length > 0;

        if (!hasCourseId && hasCourseName) {
          payload.course_id = await resolveCourseIdFromName(payload.course_name);
        }

        if (payload.course_id != null && String(payload.course_id).trim() !== '') {
          delete payload.course_name;
        }
      }

      if (!newRow.isNew && normalizedTableName.includes('assignment')) {
        const hasCourseName = typeof payload.course_name === 'string' && payload.course_name.trim().length > 0;
        const hasCourseId = payload.course_id != null && String(payload.course_id).trim() !== '';

        if (!hasCourseId && hasCourseName) {
          payload.course_id = await resolveCourseIdFromName(payload.course_name);
        }

        if ('course_name' in payload) {
          delete payload.course_name;
        }
      }

      if (!newRow.isNew && Object.keys(payload).length === 0) {
        return oldRow;
      }

      if (normalizedTableName.includes('participation')) {
        const lessonId = newRow?.lesson_id ?? oldRow?.lesson_id;
        const studentId = newRow?.student_id ?? oldRow?.student_id;

        if (lessonId == null || studentId == null) {
          throw new Error('Participation update requires lesson_id and student_id');
        }

        if (lessonId != null) payload.lesson_id = lessonId;
        if (studentId != null) payload.student_id = studentId;
      }

      const rowIdentity = newRow.isNew ? getRowIdentity(newRow) : getRowIdentity(oldRow);
      const dbRowIdentity = newRow.isNew ? getDbRowIdentity(newRow) : getDbRowIdentity(oldRow);

      if (newRow.isNew) {
        const response = await authFetch(
          `http://localhost:8000/api/table/${encodeURIComponent(targetWriteTableName)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          throw new Error(`Create failed with status ${response.status}`);
        }

        const data = await response.json();
        const updatedRow = { ...data.row, isNew: false };

        setGridRows((previousRows) =>
          previousRows.map((row) => (getRowIdentity(row) === rowIdentity ? updatedRow : row)),
        );

        return updatedRow;
      }

      let response;

      if (normalizedTableName.includes('participation')) {
        const lessonId = newRow?.lesson_id ?? oldRow?.lesson_id;
        const studentId = newRow?.student_id ?? oldRow?.student_id;

        if (lessonId == null || studentId == null) {
          throw new Error('Participation update requires lesson_id and student_id');
        }

        response = await authFetch(
          `http://localhost:8000/api/table/Participation/${encodeURIComponent(studentId)}/${encodeURIComponent(lessonId)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );
      } else {
        if (dbRowIdentity == null || dbRowIdentity === '') {
          throw new Error('Missing row identifier for update request');
        }

        response = await authFetch(
          `http://localhost:8000/api/table/${encodeURIComponent(targetWriteTableName)}/${encodeURIComponent(dbRowIdentity)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );
      }

      if (!response.ok) {
        throw new Error(`Update failed with status ${response.status}`);
      }

      const data = await response.json();
      const preservedRowIdentity = oldRow?.[rowIdField] ?? newRow?.[rowIdField];
      const updatedRow = {
        ...oldRow,
        ...newRow,
        ...(data.row || {}),
        isNew: false,
        __writeTableName: targetWriteTableName,
      };

      if (rowIdField === '__rowKey') {
        updatedRow.__rowKey = oldRow?.__rowKey ?? newRow?.__rowKey;
      } else if (preservedRowIdentity != null) {
        updatedRow[rowIdField] = preservedRowIdentity;
      }

      setGridRows((previousRows) =>
        previousRows.map((row) => (getRowIdentity(row) === rowIdentity ? updatedRow : row)),
      );

      return updatedRow;
    } finally {
      setIsRowMutating(false);
    }
  };

  const handleProcessRowUpdateError = (error) => {
    console.error('Error updating row:', error);
    alert(`Error updating row: ${error.message || error}`);
  };

  const handleRowModesModelChange = (newRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  const handleSignIn = async ({ email, password }) => {
    const response = await fetch('http://localhost:8000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || 'Invalid email or password');
    }

    const data = await response.json();
    const token = data.access_token;
    if (!token) {
      throw new Error('Login response does not include access token');
    }

    const resolvedEmail = data.email ?? email;
    const resolvedRole = data.role ?? '';

    setAuthToken(token);
    setIsAuthenticated(true);
    setCurrentUserEmail(resolvedEmail);
    setCurrentRole(resolvedRole);

    localStorage.setItem('db-project-auth-token', token);
    localStorage.setItem('db-project-user-email', resolvedEmail);
    localStorage.setItem('db-project-role', resolvedRole);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthToken('');
    setCurrentUserEmail('');
    setCurrentRole('');
    setNavigation([]);
    setGridRows([]);
    setBaseColumns([]);
    setRowModesModel({});
    localStorage.removeItem('db-project-auth');
    localStorage.removeItem('db-project-auth-token');
    localStorage.removeItem('db-project-user-email');
    localStorage.removeItem('db-project-role');
    navigate('/');
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('db-project-auth-token');
    if (!storedToken) {
      return;
    }

    setAuthToken(storedToken);
    setCurrentUserEmail(localStorage.getItem('db-project-user-email') || '');
    setCurrentRole(localStorage.getItem('db-project-role') || '');
    setIsAuthenticated(true);
  }, []);


  useEffect(() => {
    if (!isAuthenticated || !authToken) {
      return;
    }

    const endpoint = 'http://localhost:8000/api/sps';

    authFetch(endpoint)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch table list: ${response.status} - ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        const nav = data["tables"].map((table) => ({
          segment: table,
          title: formatTableName(table),
        }));
        setNavigation(nav);
      })
      .catch((error) => {
        console.error('Error fetching table list:', error);
        alert(`Error loading tables: ${error.message}`);
      });
  }, [isAuthenticated, authToken, currentRole]);

  useEffect(() => {
    if (!isAuthenticated || selectedTable || navigation.length === 0) {
      return;
    }

    navigate(`/${encodeURIComponent(navigation[0].segment)}`, { replace: true });
  }, [isAuthenticated, navigate, navigation, selectedTable]);

    // Load rows when a navigation item (route) is clicked
  useEffect(() => {
    if (!isAuthenticated || !authToken || !selectedTable) return;

    // clear previous table data immediately
    setIsTableLoading(true);
    setGridRows([]);
    setBaseColumns([]);
    setRowIdField('id');
    setDbRowIdField('id');
    setRowModesModel({});

    const endpoint = `http://localhost:8000/api/sp/${encodeURIComponent(selectedTable)}`;

    authFetch(endpoint)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load table: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        const incomingRows = data.rows || [];
        const sample = incomingRows[0] || {};
        const idLikeFields = Object.keys(sample).filter((key) => /(^id$|_id$)/i.test(key));
        const candidateIdFields = Array.from(new Set(['id', ...idLikeFields]));

        const detectedDbRowIdField = candidateIdFields.find((field) => {
          const values = incomingRows
            .map((row) => row?.[field])
            .filter((value) => value != null);

          if (values.length === 0) {
            return false;
          }

          return new Set(values.map((value) => String(value))).size === values.length;
        }) || candidateIdFields.find((field) =>
          incomingRows.some((row) => row?.[field] != null),
        ) || 'id';

        const detectedRowIdField = candidateIdFields.find((field) => {
          const values = incomingRows.map((row) => row?.[field]);
          const hasNullOrUndefined = values.some((value) => value == null);
          if (hasNullOrUndefined) {
            return false;
          }

          return new Set(values.map((value) => String(value))).size === values.length;
        }) || '__rowKey';

        const rows = incomingRows.map((row, index) => {
          const rowWithWriteTarget = { ...row, __writeTableName: selectedTable || writeTableName };

          if (detectedRowIdField === '__rowKey') {
            return { ...rowWithWriteTarget, __rowKey: `${selectedTable}-${index}` };
          }

          return rowWithWriteTarget;
        });

        const hiddenParticipationFields = new Set(['lesson_id', 'student_id']);
        const hiddenAssignmentFields = new Set(['assignment_id']);

        const columns = Object.keys(sample)
          .filter((key) => !(isParticipationTable && hiddenParticipationFields.has(String(key).toLowerCase()))
                        && !(isAssignmentsTable && hiddenAssignmentFields.has(String(key).toLowerCase())))
          .map((key) => {
            const normalizedFieldKey = String(key).replaceAll('_', '').toLowerCase();
            const isStatusNameField = normalizedFieldKey === 'statusname';
            const isIdentifierField = key === detectedRowIdField || key === detectedDbRowIdField || key === 'id';
            const showHoverEditForCell =
              (isAssignmentsTable && canModifyRows && !isIdentifierField)
              || (canEditRowsForSelectedTable && isStatusNameField);

            return {
              field: key,
              headerName: formatTableName(key),
              flex: 1,
              width: 80,
              editable: (canAddRowsForSelectedTable || canEditRowsForSelectedTable)
                && key !== detectedRowIdField
                && key !== detectedDbRowIdField,
              type: isParticipationTable && isStatusNameField ? 'singleSelect' : undefined,
              valueOptions: isParticipationTable && isStatusNameField ? statusOptions : undefined,
              renderEditCell: isParticipationTable && isStatusNameField
                ? (params) => (
                  <Select
                    size="small"
                    fullWidth
                    value={params.value ?? ''}
                    onChange={(event) => {
                      params.api.setEditCellValue(
                        {
                          id: params.id,
                          field: params.field,
                          value: event.target.value,
                        },
                        event,
                      );
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          borderRadius: 2,
                          maxHeight: 260,
                        },
                      },
                      MenuListProps: {
                        dense: true,
                      },
                    }}
                    sx={{
                      backgroundColor: 'background.paper',
                      borderRadius: 1,
                      minWidth: 140,
                      '& .MuiSelect-select': {
                        py: 0.75,
                      },
                    }}
                  >
                    {statusOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                )
                : undefined,
              valueFormatter: (paramsOrValue) => formatGridDateTimeValue(paramsOrValue),
              renderCell: showHoverEditForCell
                ? (params) => (
                <Box
                  sx={{
                    alignItems: 'center',
                    display: 'flex',
                    minWidth: 0,
                    position: 'relative',
                    pr: 4,
                    width: '100%',
                    '&:hover .cell-edit-trigger': {
                      opacity: 1,
                    },
                  }}
                >
                  <Box
                    component="span"
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}
                  >
                    {params.value ?? ''}
                  </Box>
                  <IconButton
                    className="cell-edit-trigger"
                    size="small"
                    aria-label="Edit row"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRowModesModel((previousModel) => ({
                        ...previousModel,
                        [params.id]: { mode: GridRowModes.Edit, fieldToFocus: params.field },
                      }));
                    }}
                    sx={{
                      opacity: 0,
                      position: 'absolute',
                      right: 4,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      transition: 'opacity 120ms ease-in-out',
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              )
                : undefined,
            };
          });

        setGridRows(rows);
        setBaseColumns(columns);
        setRowIdField(detectedRowIdField);
        setDbRowIdField(detectedDbRowIdField);
      })
      .catch((err) => {
        console.error('Error fetching table data:', err);
        alert(`Error loading table ${selectedTable}: ${err.message}`);
      })
      .finally(() => setIsTableLoading(false));
  }, [isAuthenticated, authToken, selectedTable, canAddRowsForSelectedTable, canEditRowsForSelectedTable, isParticipationTable, statusOptions, writeTableName]);

  if (!isAuthenticated) {
    return <SignInSide onSignIn={handleSignIn} />;
  }

  const session = {
    user: {
      email: currentUserEmail,
    },
  };

  const authentication = {
    signIn: () => {},
    signOut: handleLogout,
  };

  const items = currentRole === 'student' ? ['Classmates', 'v_courses', 'v_assignments', 'v_schedule'] : ['Departments', 'Students', 'Courses', 'Enrollments', 'Professors', 'Classrooms'];

  return (

    <ReactRouterAppProvider
      navigation={navigation}
      session={session}
      authentication={authentication}
      branding={{
        title: "University Database",
        logo: <SchoolIcon fontSize="large" sx={{ color: 'primary.main' }} />,
      }}
      theme={customTheme}
      
    >
      <DashboardLayout
        slots={{
          toolbarActions: HeaderThemeSwitcher,
          toolbarAccount: Account,
        }}
        slotProps={{
          toolbarAccount: {
            slotProps: {
              preview: {
                variant: 'condensed',
                slotProps: {
                  avatarIconButton: {
                    sx: {
                      ...customTheme.applyStyles('dark', {
                        color: 'hsl(220, 35%, 8%)',
                        backgroundColor: 'hsl(220, 30%, 96%)',
                        boxShadow: '0 10px 28px rgba(3, 8, 20, 0.4)',
                        '&:hover': {
                          backgroundColor: 'hsl(220, 24%, 90%)',
                        },
                      }),
                    },
                  },
                  avatar: {
                    sx: {
                      ...customTheme.applyStyles('dark', {
                        color: 'hsl(220, 35%, 8%)',
                        backgroundColor: 'hsl(220, 30%, 96%)',
                      }),
                    },
                  },
                },
              },
              popover: {
                slotProps: {
                  paper: {
                    sx: {
                      ...customTheme.applyStyles('dark', {
                        backgroundColor: 'rgba(8, 19, 34, 0.96)',
                        border: '1px solid rgba(64, 92, 130, 0.28)',
                      }),
                    },
                  },
                },
              },
              signOutButton: {
                sx: {
                  ...customTheme.applyStyles('dark', {
                    color: 'hsl(220, 35%, 8%)',
                    backgroundColor: 'hsl(220, 30%, 96%)',
                    '&:hover': {
                      backgroundColor: 'hsl(220, 24%, 90%)',
                    },
                  }),
                },
              },
            },
          },
        }}
        sx={{
          background: 'radial-gradient(circle at top, rgba(210, 227, 252, 0.45), rgba(255, 255, 255, 0.95) 40%)',
          ...(customTheme.applyStyles('dark', {
            background: 'radial-gradient(circle at top, rgba(37, 99, 235, 0.14), rgba(7, 18, 33, 0.98) 36%)',
          })),
          '& .MuiDrawer-paper': {
            backgroundColor: 'rgba(248, 250, 252, 0.92)',
            borderRight: '1px solid rgba(148, 163, 184, 0.2)',
            backdropFilter: 'blur(12px)',
            ...(customTheme.applyStyles('dark', {
              backgroundColor: 'rgba(8, 19, 34, 0.94)',
              borderRight: '1px solid rgba(64, 92, 130, 0.28)',
            })),
          },
          '& .MuiAppBar-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.82)',
            borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
            backdropFilter: 'blur(12px)',
            boxShadow: 'none',
            ...(customTheme.applyStyles('dark', {
              backgroundColor: 'rgba(8, 19, 34, 0.86)',
              borderBottom: '1px solid rgba(64, 92, 130, 0.24)',
            })),
            '& .MuiIconButton-root': {
              ...(customTheme.applyStyles('dark', {
                color: 'hsl(220, 35%, 8%)',
                backgroundColor: 'hsl(220, 30%, 96%)',
                boxShadow: '0 10px 28px rgba(3, 8, 20, 0.4)',
                '&:hover': {
                  backgroundColor: 'hsl(220, 24%, 90%)',
                },
              })),
            },
          },
        }}
      >
        <PageContainer>
          <Box sx={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            {canAddRowsForSelectedTable ? (
              <Button variant="contained" color="primary" sx={{ color: '#ffffff', boxShadow: '0 10px 24px rgba(25, 118, 210, 0.22)', ...(customTheme.applyStyles('dark', { color: 'hsl(220, 35%, 8%)', backgroundColor: 'hsl(220, 30%, 96%)', boxShadow: '0 10px 28px rgba(3, 8, 20, 0.4)', '&:hover': { backgroundColor: 'hsl(220, 24%, 90%)' } })) }} startIcon={<AddIcon sx={{ color: 'inherit' }} />} onClick={handleAddClick} disabled={!selectedTable}>
                Add row
              </Button>
            ) : null}
          </Box>
          {selectedTable ? (
            <DataGrid
              key={selectedTable}
              rows={gridRows}
              columns={gridColumns}
              getRowId={(row) => row?.__rowKey ?? row?.[rowIdField] ?? row?.id}
              loading={isTableLoading || isRowMutating}
              isCellEditable={(params) => {
                if (!canModifyRows) {
                  return false;
                }

                if (isAssignmentsTable) {
                  return canModifyRows
                    && !isRowMutating
                    && params.field !== 'id'
                    && params.field !== rowIdField
                    && params.field !== dbRowIdField
                    && params.field !== 'actions';
                }

                if (canShowTableActions) {
                  const normalizedField = String(params.field).replaceAll('_', '').toLowerCase();
                  return normalizedField === 'statusname';
                }

                return false;
              }}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                backgroundColor: 'background.paper',
                '& .MuiDataGrid-columnHeader': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  borderBottom: '1px solid rgba(148, 163, 184, 0.28)',
                },
                '& .MuiDataGrid-toolbar': {
                  backgroundColor: 'rgba(255, 255, 255, 0.72)',
                  borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                },
                '& .MuiDataGrid-cell': {
                  borderColor: 'rgba(148, 163, 184, 0.18)',
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                },
                ...(customTheme.applyStyles('dark', {
                  boxShadow: '0 18px 48px rgba(2, 8, 20, 0.4)',
                  '& .MuiDataGrid-columnHeader': {
                    backgroundColor: 'rgba(24, 41, 68, 0.96)',
                    borderBottom: '1px solid rgba(64, 92, 130, 0.36)',
                  },
                  '& .MuiDataGrid-toolbar': {
                    backgroundColor: 'rgba(8, 19, 34, 0.94)',
                    borderBottom: '1px solid rgba(64, 92, 130, 0.28)',
                  },
                  '& .MuiDataGrid-cell': {
                    borderColor: 'rgba(64, 92, 130, 0.2)',
                  },
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: 'rgba(32, 52, 84, 0.72)',
                  },
                })),
              }}
              showToolbar
              editMode="row"
              rowModesModel={rowModesModel}
              onRowModesModelChange={handleRowModesModelChange}
              processRowUpdate={processRowUpdate}
              onProcessRowUpdateError={handleProcessRowUpdateError}
              slots={{
                loadingOverlay: GridLoadingOverlay,
              }}
            />
          ) : (
            <Box
              sx={{
                alignItems: 'center',
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                display: 'flex',
                justifyContent: 'center',
                minHeight: 360,
                px: 3,
                ...(customTheme.applyStyles('dark', {
                  boxShadow: '0 18px 48px rgba(2, 8, 20, 0.4)',
                })),
              }}
            >
              <Typography variant="h6" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                {navigation.length === 0 ? 'No tables were found in the database.' : 'Select a table from the sidebar to open the dashboard.'}
              </Typography>
            </Box>
          )}
        </PageContainer>
      </DashboardLayout>
    </ReactRouterAppProvider>

  )
}

export default App
