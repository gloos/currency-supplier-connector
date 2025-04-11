import React, { Suspense } from 'react';
import { ProjectForm } from '@/components/project/project-form';
import { Skeleton } from '@/components/ui/skeleton'; // For Suspense fallback

const ProjectNewPage: React.FC = () => {
    return (
        <div className="container mx-auto py-8">
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <ProjectForm />
            </Suspense>
        </div>
    );
};

export default ProjectNewPage; 