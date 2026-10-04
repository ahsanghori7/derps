import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import { IoIosArrowBack } from 'react-icons/io';

const GoBack = () => {
    const navigate = useNavigate();

    return (
        <Button
            onClick={() => navigate(-1)}
            style={{
                minWidth: 40,
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'var(--dashboard-card-bg)',
                border: '1px solid var(--dashboard-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
        >
            <IoIosArrowBack size={18} color="var(--dashboard-text-secondary)" />
        </Button>
    );
};

export default GoBack;
