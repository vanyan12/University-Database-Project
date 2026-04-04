import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import SettingsSuggestRoundedIcon from '@mui/icons-material/SettingsSuggestRounded';
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded';

const items = [
  {
    icon: <SettingsSuggestRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Unified academic records',
  },
  {
    icon: <ConstructionRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Built for daily operations',
  },
  {
    icon: <ThumbUpAltRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Clear table navigation',
  },
  {
    icon: <AutoFixHighRoundedIcon sx={{ color: 'text.secondary' }} />,
    title: 'Practical academic workflow',
  },
];

export default function Content() {
  return (
    <Stack
      sx={{
        flexDirection: 'column',
        alignSelf: 'center',
        gap: { xs: 3, md: 4 },
        maxWidth: 1200,
        alignItems: 'center',
      }}
    >
      {/* SVG Illustration */}
      <Box
        sx={{
          width: { xs: 220, sm: 280, md: 300 },
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          src="/Dashboard-amico.svg"
          alt="University Database Dashboard"
          style={{
            width: '100%',
            height: 'auto',
            maxWidth: 300,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))',
          }}
        />
      </Box>

      {/* Text Content */}
      <Stack
        sx={{
          flexDirection: 'column',
          gap: 3,
          maxWidth: 500,
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
          Manage university data
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Access and manage academic records from a unified dashboard.
        </Typography>

        {/* Features Grid */}
        <Stack
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
            gap: { xs: 2.5, sm: 3 },
            width: '100%',
            mt: 2,
          }}
        >
          {items.map((item, index) => (
            <Stack
              key={index}
              sx={{
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                }}
              >
                {item.icon}
              </Box>
              <Typography sx={{ fontWeight: 500, fontSize: '0.95rem' }}>
                {item.title}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
