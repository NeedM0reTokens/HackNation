import React from 'react';

export interface ViewHeaderProps {
  title: React.ReactNode;
  description: React.ReactNode;
  className?: string;
}

export const ViewHeader: React.FC<ViewHeaderProps> = ({
  title,
  description,
  className = '',
}) => {
  return (
    <div className={`zus-view-header ${className}`.trim()}>
      <h1 className="zus-view-title">{title}</h1>
      <p className="zus-view-desc">{description}</p>
    </div>
  );
};
