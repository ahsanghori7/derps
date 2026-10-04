import { Box, Typography } from '@mui/material';

const TaxDashboardBox = ({ title, amount, subtitle, compact = false, selected = false }) => {
    return (
        <Box
            sx={{
                backgroundColor: 'var(--dashboard-tab-box)',
                borderRadius: compact ? '10px' : '12px',
                border: '2px solid',
                borderColor: selected ? '#0C79F7' : 'rgba(0, 0, 0, 0.25)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                boxSizing: 'border-box',
                minHeight: compact ? '84px' : '110px',
                height: compact ? '84px' : 'auto',
                width: compact ? '100%' : 360,
                maxWidth: compact ? '100%' : 360,
                paddingX: compact ? '10px' : '16px',
                paddingY: compact ? '8px' : 0,
                paddingTop: compact ? '8px' : '6px',
                paddingBottom: compact ? '8px' : 0,
                display: compact ? 'flex' : 'block',
                flexDirection: compact ? 'column' : 'initial',
                justifyContent: compact ? 'space-between' : 'initial',
            }}
        >
            <Typography
                sx={{
                    fontSize: compact ? '12px' : '22px',
                    fontWeight: 700,
                    color: '#0C79F7',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {title}
            </Typography>
            <Typography
                sx={{
                    fontSize: compact ? '20px' : '26px',
                    fontWeight: 700,
                    color: 'var(--sidebar-text-primary)',
                    lineHeight: 1.1,
                    marginTop: compact ? '2px' : 0,
                }}
            >
                {amount}
            </Typography>
            <Typography
                sx={{
                    fontSize: compact ? '9px' : '12px',
                    color: 'var(--dashboard-text-secondary)',
                    fontWeight: 500,
                    lineHeight: 1.25,
                    marginTop: compact ? '2px' : 0,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                }}
            >
                {subtitle}
            </Typography>
        </Box>
    );
};

export default TaxDashboardBox;