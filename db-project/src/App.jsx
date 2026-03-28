import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import './App.css'
import {
  DataGrid,
  GridActionsCellItem,
  GridRowEditStopReasons,
  GridRowModes,
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { DashboardLayout, ThemeSwitcher } from '@toolpad/core/DashboardLayout';
import { ReactRouterAppProvider } from '@toolpad/core/react-router';
import { PageContainer } from '@toolpad/core/PageContainer';
import { Account } from '@toolpad/core/Account';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Close';
import { createTheme } from '@mui/material/styles';
import SchoolIcon from '@mui/icons-material/School';
import SignInSide from './sign-in-side/SignInSide.jsx';


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
  const withSpaces = name.replaceAll('_', ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

function GridLoadingOverlay() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <CircularProgress />
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
  const [rowModesModel, setRowModesModel] = useState({});
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const canModifyRows = ['prof', 'professor', 'admin'].includes((currentRole || '').toLowerCase());


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

  const gridColumns = useMemo(() => {
    if (!canModifyRows) {
      return baseColumns.filter((column) => column.field);
    }

    const actionsColumn = {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

        if (isInEditMode) {
          return [
            <GridActionsCellItem icon={<SaveIcon />} label="Save" onClick={handleSaveClick(id)} />,
            <GridActionsCellItem icon={<CancelIcon />} label="Cancel" onClick={handleCancelClick(id)} />,
          ];
        }

        return [
          <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={handleEditClick(id)} />,
          <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={handleDeleteClick(id)} />,
        ];
      },
    };

    return [...baseColumns, actionsColumn].filter((column) => column.field);
  }, [baseColumns, canModifyRows, rowModesModel]);

  const getRowIdentity = (row) => row?.[rowIdField] ?? row?.id;

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

  const handleAddClick = () => {
    const newId = Date.now();

    const editableFields = gridColumns
      .filter((column) => column?.field && column.field !== rowIdField && column.field !== 'id' && column.field !== 'actions')
      .map((column) => column.field);

    const newRow = { id: newId, isNew: true };
    editableFields.forEach((field) => {
      newRow[field] = '';
    });

    setGridRows((previousRows) => [...previousRows, newRow]);

    const firstField = editableFields[0];
    setRowModesModel((previousModel) => ({
      ...previousModel,
      [newId]: firstField
        ? { mode: GridRowModes.Edit, fieldToFocus: firstField }
        : { mode: GridRowModes.Edit },
    }));
  };

  const handleRowEditStop = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleEditClick = (id) => () => {
    setRowModesModel((previousModel) => ({
      ...previousModel,
      [id]: { mode: GridRowModes.Edit },
    }));
  };

  const handleSaveClick = (id) => () => {
    setRowModesModel((previousModel) => ({
      ...previousModel,
      [id]: { mode: GridRowModes.View },
    }));
  };

  const handleDeleteClick = (id) => async () => {
    const rowToDelete = gridRows.find((row) => getRowIdentity(row) === id);

    if (rowToDelete?.isNew) {
      setGridRows((previousRows) => previousRows.filter((row) => getRowIdentity(row) !== id));
      return;
    }

    try {
      const response = await authFetch(
        `http://localhost:8000/api/table/${encodeURIComponent(selectedTable)}/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      setGridRows((previousRows) => previousRows.filter((row) => getRowIdentity(row) !== id));
    } catch (error) {
      console.error('Error deleting row:', error);
    }
  };

  const handleCancelClick = (id) => () => {
    setRowModesModel((previousModel) => ({
      ...previousModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    }));

    const editedRow = gridRows.find((row) => getRowIdentity(row) === id);
    if (editedRow?.isNew) {
      setGridRows((previousRows) => previousRows.filter((row) => getRowIdentity(row) !== id));
    }
  };

  const processRowUpdate = async (newRow) => {
    const payload = Object.fromEntries(
      Object.entries(newRow).filter(
        ([field]) => field !== rowIdField && field !== 'id' && field !== 'isNew' && field !== 'actions',
      ),
    );

    const rowIdentity = getRowIdentity(newRow);

    if (newRow.isNew) {
      const response = await authFetch(
        `http://localhost:8000/api/table/${encodeURIComponent(selectedTable)}`,
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

    const response = await authFetch(
      `http://localhost:8000/api/table/${encodeURIComponent(selectedTable)}/${encodeURIComponent(rowIdentity)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error(`Update failed with status ${response.status}`);
    }

    const data = await response.json();
    const updatedRow = { ...data.row, isNew: false };

    setGridRows((previousRows) =>
      previousRows.map((row) => (getRowIdentity(row) === rowIdentity ? updatedRow : row)),
    );

    return updatedRow;
  };

  const handleProcessRowUpdateError = (error) => {
    console.error('Error updating row:', error);
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

    authFetch('http://localhost:8000/api/tables')
      .then((response) => response.json())
      .then((data) => {
        const nav = data["tables"].map((table) => ({
          segment: table,
          title: formatTableName(table),
        }));
        setNavigation(nav);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
      });
  }, [isAuthenticated, authToken]);

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
    setRowModesModel({});

    authFetch(`http://localhost:8000/api/table/${encodeURIComponent(selectedTable)}`)
      .then((res) => res.json())
      .then((data) => {
        const incomingRows = data.rows || [];
        const sample = incomingRows[0] || {};
        const detectedRowIdField = Object.prototype.hasOwnProperty.call(sample, 'id')
          ? 'id'
          : Object.keys(sample).find((key) => key.endsWith('_id')) || 'id';

        const rows = incomingRows.map((row, index) => (
          detectedRowIdField === 'id' && row.id == null
            ? { id: index + 1, ...row }
            : row
        ));

        const columns = Object.keys(sample)
          .map((key) => ({
            field: key,
            headerName: formatTableName(key),
            flex: 1,
            width: 80,
            editable: canModifyRows && key !== detectedRowIdField,
          }));

        setGridRows(rows);
        setBaseColumns(columns);
        setRowIdField(detectedRowIdField);
      })
      .catch((err) => console.error('Error fetching table data:', err))
      .finally(() => setIsTableLoading(false));
  }, [isAuthenticated, authToken, selectedTable, canModifyRows]);

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
            {canModifyRows ? (
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
              getRowId={(row) => row?.[rowIdField] ?? row?.id}
              loading={isTableLoading}
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
              onRowEditStop={handleRowEditStop}
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
