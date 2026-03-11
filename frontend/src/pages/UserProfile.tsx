import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Role, UpdateUserRequest } from '../types/auth';
import { userApi, evaluationApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ProfilePhotoUpload from '../components/ProfilePhotoUpload';
import { getImageUrl } from '../utils/imageUrl';
import DisciplinaryBadge from '../components/DisciplinaryBadge';
import { useLanguage } from '../i18n';
import EvaluationPanel from '../components/evaluations/EvaluationPanel';
import { EmployeeEvaluationSummary, DisciplinaryStatus } from '../types/evaluation';

const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'Administrator',
  [Role.DIRECTOR]: 'Director',
  [Role.HR]: 'Human Resources',
  [Role.BUSINESS_BLOCK]: 'Business Block',
  [Role.DEPARTMENT_LEADER]: 'Department Leader',
  [Role.EMPLOYEE]: 'Employee',
};

const roleColors: Record<Role, string> = {
  [Role.ADMIN]: 'bg-purple-100 text-purple-800',
  [Role.DIRECTOR]: 'bg-blue-100 text-blue-800',
  [Role.HR]: 'bg-green-100 text-green-800',
  [Role.BUSINESS_BLOCK]: 'bg-orange-100 text-orange-800',
  [Role.DEPARTMENT_LEADER]: 'bg-red-100 text-red-800',
  [Role.EMPLOYEE]: 'bg-gray-100 text-gray-800',
};

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateUserRequest>({});
  const [saving, setSaving] = useState(false);
  const [evalSummary, setEvalSummary] = useState<EmployeeEvaluationSummary | null>(null);

  const isOwnProfile = currentUser?.id === id;
  const isAdmin = currentUser?.role === Role.ADMIN;
  const { t } = useLanguage();
  const canEdit = isOwnProfile || isAdmin;

  useEffect(() => {
    if (id) {
      loadProfile();
    }
  }, [id]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [profileRes] = await Promise.all([
        userApi.getById(id!),
      ]);
      setProfile(profileRes.data);
      setEditData({
        fullName: profileRes.data.fullName,
        email: profileRes.data.email,
        jobTitle: profileRes.data.jobTitle || '',
        phoneNumber: profileRes.data.phoneNumber || '',
        bio: profileRes.data.bio || '',
      });
      // Load evaluation summary separately (may fail if user has no evaluations)
      try {
        const summaryRes = await evaluationApi.getEmployeeSummary(id!);
        setEvalSummary(summaryRes.data);
      } catch {
        setEvalSummary(null);
      }
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      await userApi.uploadPhoto(id!, file);
      loadProfile();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload photo');
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await userApi.update(id!, editData);
      setIsEditing(false);
      loadProfile();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-700 font-medium">{t.loadingProfile}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <p className="text-xl text-slate-600">{t.userNotFound}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            {t.backToDashboard}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t.back}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
              &times;
            </button>
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          {/* Cover Banner */}
          <div className="h-32 bg-primary"></div>

          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row gap-6 -mt-16">
              {/* Profile Photo */}
              <div className="flex-shrink-0">
                <ProfilePhotoUpload
                  currentPhotoUrl={getImageUrl(profile.profilePhotoUrl)}
                  userName={profile.fullName}
                  canEdit={canEdit}
                  onUpload={handlePhotoUpload}
                />
              </div>

              {/* Profile Info */}
              <div className="flex-1 pt-4 md:pt-8">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.fullName || ''}
                        onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                        className="text-2xl font-bold text-slate-800 border-b-2 border-primary focus:outline-none bg-transparent"
                      />
                    ) : (
                      <h1 className="text-2xl font-bold text-slate-800">{profile.fullName}</h1>
                    )}

                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.jobTitle || ''}
                        onChange={(e) => setEditData({ ...editData, jobTitle: e.target.value })}
                        placeholder={t.jobTitle}
                        className="text-slate-600 border-b border-slate-300 focus:outline-none focus:border-primary bg-transparent mt-1 w-full"
                      />
                    ) : (
                      profile.jobTitle && (
                        <p className="text-slate-600 mt-1">{profile.jobTitle}</p>
                      )
                    )}

                    <div className="flex items-center gap-3 mt-3">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${roleColors[profile.role]}`}>
                        {roleLabels[profile.role]}
                      </span>
                      {!profile.isActive && (
                        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                          {t.inactive}
                        </span>
                      )}
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            {t.cancel}
                          </button>
                          <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            {saving ? t.saving : t.save}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          {t.editProfile}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Bio Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{t.contactInformation}</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.email}</p>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="text-slate-800 border-b border-slate-300 focus:outline-none focus:border-primary bg-transparent"
                    />
                  ) : (
                    <p className="text-slate-800">{profile.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.phone}</p>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editData.phoneNumber || ''}
                      onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                      placeholder="Add phone number"
                      className="text-slate-800 border-b border-slate-300 focus:outline-none focus:border-primary bg-transparent"
                    />
                  ) : (
                    <p className="text-slate-800">{profile.phoneNumber || '—'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.username}</p>
                  <p className="text-slate-800">@{profile.username}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{t.about}</h2>
            {isEditing ? (
              <textarea
                value={editData.bio || ''}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                placeholder="Write a short bio..."
                className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
              />
            ) : (
              <p className="text-slate-600 leading-relaxed">
                {profile.bio || 'No bio provided.'}
              </p>
            )}

            {/* Account Info */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t.memberSince}</span>
                <span className="text-slate-700">
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-slate-500">{t.lastLogin}</span>
                <span className="text-slate-700">
                  {profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Departments */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">{t.assignedDepartments}</h2>
          {profile.assignedDepartments && profile.assignedDepartments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.assignedDepartments.map(dept => (
                <div
                  key={dept.id}
                  className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold">
                      {dept.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{dept.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">
              {t.noDepartmentsAssigned}
            </p>
          )}
        </div>

        {/* Evaluation Panel for Director/HR/Admin */}
        {!isOwnProfile && id && (currentUser?.role === Role.DIRECTOR || currentUser?.role === Role.HR || currentUser?.role === Role.ADMIN) && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <EvaluationPanel
              targetType="EMPLOYEE"
              targetId={id}
              onEvaluationSaved={loadProfile}
            />
          </div>
        )}

        {/* Evaluation Performance History */}
        {evalSummary && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">{t.performanceEvaluationHistory}</h2>
              <DisciplinaryBadge
                status={evalSummary.disciplinaryStatus as DisciplinaryStatus}
                count={evalSummary.belowExpectationsCount}
                size="md"
              />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                <div className="text-3xl font-bold text-slate-800">{evalSummary.totalEvaluations}</div>
                <div className="text-xs text-slate-500 mt-1">{t.totalEvaluations}</div>
              </div>
              <div className={`rounded-xl p-4 text-center border ${evalSummary.belowExpectationsCount > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className={`text-3xl font-bold ${evalSummary.belowExpectationsCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {evalSummary.belowExpectationsCount}
                </div>
                <div className="text-xs text-slate-500 mt-1">{t.belowExpectations}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                <div className="text-3xl font-bold text-emerald-700">
                  {evalSummary.totalEvaluations - evalSummary.belowExpectationsCount}
                </div>
                <div className="text-xs text-slate-500 mt-1">{t.satisfactory}</div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            {evalSummary.totalEvaluations > 0 && (
              <div className="mb-5">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{t.belowExpectationsRate}</span>
                  <span className="font-semibold">
                    {Math.round((evalSummary.belowExpectationsCount / evalSummary.totalEvaluations) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      evalSummary.belowExpectationsCount === 0
                        ? 'bg-emerald-500'
                        : evalSummary.belowExpectationsCount <= 1
                        ? 'bg-amber-400'
                        : evalSummary.belowExpectationsCount <= 2
                        ? 'bg-orange-500'
                        : 'bg-red-500'
                    }`}
                    style={{
                      width: `${(evalSummary.belowExpectationsCount / evalSummary.totalEvaluations) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Evaluation Bubble Chart */}
            {evalSummary.totalEvaluations > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Array.from({ length: evalSummary.totalEvaluations }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-full ${
                        i < evalSummary.belowExpectationsCount ? 'bg-red-500' : 'bg-emerald-400'
                      }`}
                      title={i < evalSummary.belowExpectationsCount ? t.belowExpectationsLabel : t.satisfactoryLabel}
                    />
                  ))}
                  <span className="text-xs text-slate-400 ml-2">
                    {t.eachDotOneEvaluation}
                  </span>
                </div>
              </div>
            )}

            {/* Disciplinary Info Banner */}
            {evalSummary.disciplinaryStatus !== 'NONE' && (
              <div className={`rounded-lg p-4 mb-5 border ${
                evalSummary.disciplinaryStatus === 'TERMINATION_RISK'
                  ? 'bg-red-100 border-red-300'
                  : evalSummary.disciplinaryStatus === 'FINE'
                  ? 'bg-orange-50 border-orange-300'
                  : evalSummary.disciplinaryStatus === 'WARNING'
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {evalSummary.disciplinaryStatus === 'TERMINATION_RISK' ? (
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : evalSummary.disciplinaryStatus === 'FINE' ? (
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : evalSummary.disciplinaryStatus === 'WARNING' ? (
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">
                      {evalSummary.disciplinaryStatus === 'TERMINATION_RISK'
                        ? t.atRiskOfTermination
                        : evalSummary.disciplinaryStatus === 'FINE'
                        ? t.financialPenaltyApplied
                        : evalSummary.disciplinaryStatus === 'WARNING'
                        ? t.formalWarningIssued
                        : t.performanceBeingMonitored}
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">
                      {evalSummary.belowExpectationsCount} {evalSummary.belowExpectationsCount === 1 ? t.belowExpectationsEvaluation : t.belowExpectationsEvaluations}
                      {' — '}
                      {evalSummary.disciplinaryStatus === 'WATCH' ? t.disciplinaryDescWatch
                        : evalSummary.disciplinaryStatus === 'WARNING' ? t.disciplinaryDescWarning
                        : evalSummary.disciplinaryStatus === 'FINE' ? t.disciplinaryDescFine
                        : t.disciplinaryDescTermination}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Evaluation Timeline */}
            {evalSummary.recentEvaluations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">{t.recentEvaluations}</h3>
                <div className="space-y-3">
                  {evalSummary.recentEvaluations.map((ev) => {
                    const isBad = ev.letterRating === 'D' || (ev.numericRating !== undefined && ev.numericRating < 0.51);
                    return (
                      <div
                        key={ev.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          isBad ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          isBad ? 'bg-red-200 text-red-700' : 'bg-emerald-200 text-emerald-700'
                        }`}>
                          {ev.letterRating || (ev.numericRating !== undefined ? (ev.numericRating * 100).toFixed(0) + '%' : '—')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                              {ev.evaluatorType}
                            </span>
                            <span className="text-xs text-slate-400 flex-shrink-0">
                              {new Date(ev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          {ev.comment && (
                            <p className="text-xs text-slate-600 mt-1 truncate" title={ev.comment}>
                              "{ev.comment}"
                            </p>
                          )}
                          <span className={`text-xs font-medium mt-1 inline-block ${isBad ? 'text-red-600' : 'text-emerald-600'}`}>
                            {isBad ? '↓ ' + t.belowExpectationsLabel : '↑ ' + t.satisfactoryLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {evalSummary.totalEvaluations === 0 && (
              <div className="text-center py-8 text-slate-400">
                <div className="mb-2 flex justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm">{t.noEvaluationsYet}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
