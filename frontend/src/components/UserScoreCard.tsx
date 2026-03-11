import React from 'react';
import { UserWithScore, Role } from '../types/auth';
import { getImageUrl } from '../utils/imageUrl';
import Speedometer from './Speedometer';
import DisciplinaryBadge from './DisciplinaryBadge';
import { DisciplinaryStatus } from '../types/evaluation';

interface Props {
  user: UserWithScore;
  onClick?: () => void;
}

const roleColors: Record<Role, string> = {
  [Role.ADMIN]: 'bg-purple-100 text-purple-800',
  [Role.DIRECTOR]: 'bg-blue-100 text-blue-800',
  [Role.HR]: 'bg-green-100 text-green-800',
  [Role.BUSINESS_BLOCK]: 'bg-orange-100 text-orange-800',
  [Role.DEPARTMENT_LEADER]: 'bg-red-100 text-red-800',
  [Role.EMPLOYEE]: 'bg-gray-100 text-gray-800',
};

const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'Admin',
  [Role.DIRECTOR]: 'Director',
  [Role.HR]: 'HR',
  [Role.BUSINESS_BLOCK]: 'Business Block',
  [Role.DEPARTMENT_LEADER]: 'Dept Leader',
  [Role.EMPLOYEE]: 'Employee',
};

export default function UserScoreCard({ user, onClick }: Props) {
  const profilePhotoUrl = getImageUrl(user.profilePhotoUrl);

  // Create a score result object for the Speedometer
  const scoreResult = user.overallScore
    ? {
        score: user.overallScore,
        level: user.scoreLevel || 'не_соответствует',
        color: user.scoreColor || '#d9534f',
        percentage: user.scorePercentage || 0,
      }
    : {
        score: 0.0,
        level: 'не_соответствует',
        color: '#d9534f',
        percentage: 0,
      };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl hover:border-primary transition-all duration-200 cursor-pointer group"
    >
      {/* Header with gradient */}
      <div className="h-16 bg-primary relative">
        {/* Profile Photo */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="w-16 h-16 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-xl font-bold">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt={user.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              user.fullName.charAt(0).toUpperCase()
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-10 px-4 pb-4">
        {/* Name and Role */}
        <div className="text-center mb-3">
          <h3 className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors truncate">
            {user.fullName}
          </h3>
          {user.jobTitle && (
            <p className="text-xs text-slate-500 truncate">{user.jobTitle}</p>
          )}
          <div className="mt-2 flex justify-center gap-2">
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${roleColors[user.role]}`}
            >
              {roleLabels[user.role]}
            </span>
            {!user.isActive && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                Inactive
              </span>
            )}
          </div>
        </div>

        {/* Speedometer */}
        <div className="flex justify-center my-4">
          <Speedometer score={scoreResult} size="sm" compact={true} showLabel={true} />
        </div>

        {/* Disciplinary Status */}
        {user.disciplinaryStatus && user.disciplinaryStatus !== 'NONE' && (
          <div className="mt-3 flex justify-center">
            <DisciplinaryBadge
              status={user.disciplinaryStatus as DisciplinaryStatus}
              count={user.belowExpectationsCount}
              size="sm"
              showLabel={true}
              showCount={true}
            />
          </div>
        )}

        {/* Departments */}
        <div className="mt-3">
          <p className="text-xs text-slate-500 mb-1 text-center">Departments</p>
          <div className="flex flex-wrap justify-center gap-1">
            {user.assignedDepartments && user.assignedDepartments.length > 0 ? (
              <>
                {user.assignedDepartments.slice(0, 2).map((dept) => (
                  <span
                    key={dept.id}
                    className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded truncate max-w-[100px]"
                    title={dept.name}
                  >
                    {dept.name.length > 15 ? dept.name.substring(0, 15) + '...' : dept.name}
                  </span>
                ))}
                {user.assignedDepartments.length > 2 && (
                  <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                    +{user.assignedDepartments.length - 2}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-slate-400">None assigned</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
