import React from 'react';
import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-4 h-4', size, color }) => {
  // @ts-expect-error Lucide icons dynamic indexing
  const IconComponent = Icons[name] || Icons.Tag;
  return <IconComponent className={className} size={size} color={color} />;
};
