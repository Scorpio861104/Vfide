/**
 * Permissions Manager Component
 * 
 * UI for managing group member roles and permissions.
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Crown,
  Users,
  ChevronDown,
  Check,
  X,
  Settings,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  GroupMember,
  GroupRole,
  Permission,
  ROLE_INFO,
  PERMISSION_INFO,
  getRolePermissions,
  getPermissionsByCategory,
  memberHasPermission,
  useGroupMembers,
  useMemberPermissions,
} from '@/lib/groupPermissions';
import { useAnnounce } from '@/lib/accessibility';

interface PermissionsManagerProps {
  groupId: string;
  currentUserId: string;
}

export function PermissionsManager({ groupId, currentUserId }: PermissionsManagerProps) {
  const { members, loading, updateRole, updatePermissions, removeMember, reload } = useGroupMembers(groupId);
  const { hasPermission } = useMemberPermissions(currentUserId, groupId);
  const { announce } = useAnnounce();

  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canManageRoles = hasPermission(Permission.MANAGE_ROLES);
  const canRemoveMembers = hasPermission(Permission.REMOVE_MEMBERS);

  const handleSelectMember = (member: GroupMember) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!canManageRoles) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-900/30 rounded-lg p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-yellow-400 font-medium mb-1">Insufficient Permissions</h3>
          <p className="text-sm text-yellow-400/80">
            You don't have permission to manage roles and permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Member Permissions
          </h2>
          <div className="text-sm text-gray-400">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </div>
        </div>

        {/* Members List */}
        <div className="space-y-2">
          {members.map((member) => (
            <MemberCard
              key={member.userId}
              member={member}
              currentUserId={currentUserId}
              canManage={canManageRoles}
              canRemove={canRemoveMembers}
              onEdit={() => handleSelectMember(member)}
              onRemove={async () => {
                try {
                  await removeMember(member.userId);
                  announce('Member removed', 'polite');
                } catch (err) {
                  announce('Failed to remove member', 'assertive');
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isModalOpen && selectedMember && (
          <PermissionEditModal
            member={selectedMember}
            groupId={groupId}
            currentUserId={currentUserId}
            onClose={handleCloseModal}
            onUpdate={async () => {
              await reload();
              handleCloseModal();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================================
// Member Card
// ============================================================================

interface MemberCardProps {
  member: GroupMember;
  currentUserId: string;
  canManage: boolean;
  canRemove: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

function MemberCard({ member, currentUserId, canManage, canRemove, onEdit, onRemove }: MemberCardProps) {
  const roleInfo = ROLE_INFO[member.role];
  const isCurrentUser = member.userId === currentUserId;
  const isOwner = member.role === GroupRole.OWNER;

  return (
    <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-lg p-4 hover:border-[#3A3A3F] transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {member.userId.slice(0, 2).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">
                {member.userId.slice(0, 6)}...{member.userId.slice(-4)}
              </span>
              {isCurrentUser && (
                <span className="text-xs text-gray-400">(You)</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
              {member.customPermissions && member.customPermissions.length > 0 && (
                <span className="text-xs text-blue-400">+{member.customPermissions.length} custom</span>
              )}
              {member.bannedPermissions && member.bannedPermissions.length > 0 && (
                <span className="text-xs text-red-400">-{member.bannedPermissions.length} banned</span>
              )}
            </div>
          </div>

          {/* Role Icon */}
          <div className={roleInfo.color}>
            {member.role === GroupRole.OWNER && <Crown className="w-5 h-5" />}
            {member.role === GroupRole.ADMIN && <Shield className="w-5 h-5" />}
            {member.role === GroupRole.MODERATOR && <Settings className="w-5 h-5" />}
            {member.role === GroupRole.MEMBER && <Users className="w-5 h-5" />}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {canManage && !isOwner && (
            <button
              onClick={onEdit}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Edit
            </button>
          )}
          {canRemove && !isOwner && !isCurrentUser && (
            <button
              onClick={onRemove}
              className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm rounded-lg transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Permission Edit Modal
// ============================================================================

interface PermissionEditModalProps {
  member: GroupMember;
  groupId: string;
  currentUserId: string;
  onClose: () => void;
  onUpdate: () => void;
}

function PermissionEditModal({ member, groupId, currentUserId, onClose, onUpdate }: PermissionEditModalProps) {
  const { updateRole, updatePermissions } = useGroupMembers(groupId);
  const { announce } = useAnnounce();

  const [selectedRole, setSelectedRole] = useState(member.role);
  const [customPermissions, setCustomPermissions] = useState<Permission[]>(member.customPermissions || []);
  const [bannedPermissions, setBannedPermissions] = useState<Permission[]>(member.bannedPermissions || []);
  const [saving, setSaving] = useState(false);

  const rolePermissions = getRolePermissions(selectedRole);
  const permissionsByCategory = getPermissionsByCategory();

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update role if changed
      if (selectedRole !== member.role) {
        await updateRole(member.userId, selectedRole);
      }

      // Update custom permissions
      await updatePermissions(member.userId, customPermissions, bannedPermissions);

      announce('Permissions updated', 'polite');
      onUpdate();
    } catch (err) {
      announce('Failed to update permissions', 'assertive');
    } finally {
      setSaving(false);
    }
  };

  const toggleCustomPermission = (permission: Permission) => {
    if (customPermissions.includes(permission)) {
      setCustomPermissions(customPermissions.filter(p => p !== permission));
    } else {
      setCustomPermissions([...customPermissions, permission]);
      // Remove from banned if adding to custom
      setBannedPermissions(bannedPermissions.filter(p => p !== permission));
    }
  };

  const toggleBannedPermission = (permission: Permission) => {
    if (bannedPermissions.includes(permission)) {
      setBannedPermissions(bannedPermissions.filter(p => p !== permission));
    } else {
      setBannedPermissions([...bannedPermissions, permission]);
      // Remove from custom if adding to banned
      setCustomPermissions(customPermissions.filter(p => p !== permission));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Edit Permissions</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Info */}
        <div className="bg-[#0F0F14] rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-400 mb-1">Member</div>
          <div className="text-white font-medium">
            {member.userId.slice(0, 8)}...{member.userId.slice(-6)}
          </div>
        </div>

        {/* Role Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(GroupRole).map((role) => {
              const info = ROLE_INFO[role];
              const isSelected = selectedRole === role;
              const isOwner = role === GroupRole.OWNER;

              return (
                <button
                  key={role}
                  onClick={() => !isOwner && setSelectedRole(role)}
                  disabled={isOwner}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-[#2A2A2F] bg-[#0F0F14] hover:border-[#3A3A3F]'
                  } ${isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`font-medium ${info.color} mb-1`}>{info.label}</div>
                  <div className="text-xs text-gray-400">{info.description}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {getRolePermissions(role).length} permissions
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-400">Custom Permissions</div>

          {Object.entries(permissionsByCategory).map(([category, permissions]) => (
            <div key={category} className="bg-[#0F0F14] rounded-lg p-4">
              <div className="text-sm font-medium text-white mb-3">{category}</div>
              <div className="space-y-2">
                {permissions.map((permission) => {
                  const info = PERMISSION_INFO[permission];
                  const hasFromRole = rolePermissions.includes(permission);
                  const hasCustom = customPermissions.includes(permission);
                  const isBanned = bannedPermissions.includes(permission);

                  return (
                    <div
                      key={permission}
                      className="flex items-start justify-between gap-3 py-2"
                    >
                      <div className="flex-1">
                        <div className="text-sm text-white">{info.label}</div>
                        <div className="text-xs text-gray-400">{info.description}</div>
                        {hasFromRole && (
                          <div className="text-xs text-blue-400 mt-1">Included in role</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleCustomPermission(permission)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            hasCustom
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-[#1A1A1F] text-gray-600 hover:text-gray-400'
                          }`}
                          title="Grant permission"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleBannedPermission(permission)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            isBanned
                              ? 'bg-red-900/30 text-red-400'
                              : 'bg-[#1A1A1F] text-gray-600 hover:text-gray-400'
                          }`}
                          title="Deny permission"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
