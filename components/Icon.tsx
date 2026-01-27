import React from 'react';

interface IconProps {
    name: string;
    className?: string;
    filled?: boolean;
}

const Icon: React.FC<IconProps> = ({ name, className = "", filled = false }) => {
    return (
        <span 
            className={`material-symbols-outlined ${className}`}
            style={filled ? { fontVariationSettings: "'FILL' 1" } : {}}
        >
            {name}
        </span>
    );
};

export default Icon;