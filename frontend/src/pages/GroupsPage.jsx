import React, { useState, useEffect } from 'react'
import { SearchIcon, HashIcon, Users2Icon, PlusIcon, LoaderIcon, XIcon } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createGroup, joinGroupById, searchGroups, getMyGroups, leaveGroup } from '../lib/api'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router'

const GroupsPage = () => {
  const [activeTab, setActiveTab] = useState('my-groups')
  const [groupId, setGroupId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  
  // Create group form state
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    isPublic: true
  })

  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Fetch user's groups
  const { data: myGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['myGroups'],
    queryFn: getMyGroups
  })

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: joinGroupById,
    onSuccess: (group) => {
      toast.success(`Successfully joined ${group.name}!`)
      setGroupId('')
      queryClient.invalidateQueries(['myGroups'])
      // Navigate to group chat
      navigate(`/chat/group-${group._id}`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to join group')
    }
  })

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: (group) => {
      toast.success(`Group "${group.name}" created! ID: ${group.groupId}`)
      setShowCreateModal(false)
      setNewGroup({ name: '', description: '', isPublic: true })
      queryClient.invalidateQueries(['myGroups'])
      // Navigate to group chat
      navigate(`/chat/group-${group._id}`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create group')
    }
  })

  // Search groups mutation
  const searchGroupsMutation = useMutation({
    mutationFn: searchGroups,
    onSuccess: (results) => {
      setSearchResults(results)
      if (results.length === 0) {
        toast.info('No groups found matching your search')
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Search failed')
    }
  })

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: leaveGroup,
    onSuccess: () => {
      toast.success('Left group successfully')
      queryClient.invalidateQueries(['myGroups'])
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to leave group')
    }
  })

  const handleJoinGroup = (e) => {
    e.preventDefault()
    if (groupId.length === 6) {
      joinGroupMutation.mutate(groupId)
    }
  }

  const handleCreateGroup = (e) => {
    e.preventDefault()
    if (newGroup.name.trim()) {
      createGroupMutation.mutate(newGroup)
    }
  }

  const handleSearchGroups = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      searchGroupsMutation.mutate(searchQuery.trim())
    }
  }

  const handleJoinSearchedGroup = (group) => {
    joinGroupMutation.mutate(group.groupId)
  }

  const handleGroupClick = (group) => {
    navigate(`/chat/group-${group._id}`)
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users2Icon className="size-6 text-primary" />
          Groups
        </h1>
        <p className="text-gray-600 mt-1">Connect with communities and group chats</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('my-groups')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'my-groups'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Groups ({myGroups.length})
          </button>
          <button
            onClick={() => setActiveTab('join-group')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'join-group'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Join Group
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'my-groups' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Your Groups</h2>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary btn-sm"
              >
                <PlusIcon className="size-4 mr-1" />
                Create Group
              </button>
            </div>
            
            {loadingGroups ? (
              <div className="flex justify-center py-12">
                <LoaderIcon className="animate-spin size-8 text-primary" />
              </div>
            ) : myGroups.length === 0 ? (
              <div className="text-center py-12">
                <Users2Icon className="size-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No groups yet</h3>
                <p className="text-gray-500">Join or create a group to get started!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {myGroups.map((group) => (
                  <div 
                    key={group._id} 
                    className="card bg-base-100 shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleGroupClick(group)}
                  >
                    <div className="card-body p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{group.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">ID: {group.groupId}</p>
                          {group.description && (
                            <p className="text-gray-700 mb-2">{group.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{group.members.length} members</span>
                            <span>Created by {group.creator.fullName}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Are you sure you want to leave this group?')) {
                              leaveGroupMutation.mutate(group._id)
                            }
                          }}
                          className="btn btn-ghost btn-sm text-error"
                          disabled={leaveGroupMutation.isLoading}
                        >
                          Leave
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'join-group' && (
          <div className="max-w-md mx-auto">
            {/* Join by Group ID */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <HashIcon className="size-5" />
                Join by Group ID
              </h2>
              <form onSubmit={handleJoinGroup} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Enter 6-character Group ID</span>
                  </label>
                  <input
                    type="text"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    className="input input-bordered w-full text-center text-lg tracking-wider font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={groupId.length !== 6 || joinGroupMutation.isLoading}
                  className="btn btn-primary w-full"
                >
                  {joinGroupMutation.isLoading ? (
                    <LoaderIcon className="animate-spin size-4" />
                  ) : (
                    'Join Group'
                  )}
                </button>
              </form>
            </div>

            <div className="divider">OR</div>

            {/* Search Groups */}
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <SearchIcon className="size-5" />
                Search Groups
              </h2>
              <form onSubmit={handleSearchGroups} className="space-y-4">
                <div className="form-control">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for groups..."
                    className="input input-bordered w-full"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || searchGroupsMutation.isLoading}
                  className="btn btn-outline w-full"
                >
                  {searchGroupsMutation.isLoading ? (
                    <LoaderIcon className="animate-spin size-4" />
                  ) : (
                    'Search'
                  )}
                </button>
              </form>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Search Results</h3>
                  <div className="space-y-3">
                    {searchResults.map((group) => (
                      <div key={group._id} className="card bg-base-100 shadow-sm border">
                        <div className="card-body p-4">
                          <h4 className="font-semibold">{group.name}</h4>
                          <p className="text-sm text-gray-600">ID: {group.groupId}</p>
                          {group.description && (
                            <p className="text-sm text-gray-700">{group.description}</p>
                          )}
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-500">
                              {group.members.length} members
                            </span>
                            <button
                              onClick={() => handleJoinSearchedGroup(group)}
                              disabled={joinGroupMutation.isLoading}
                              className="btn btn-primary btn-sm"
                            >
                              Join
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create New Group</h3>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Group Name *</span>
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                  placeholder="Enter group name"
                  className="input input-bordered"
                  maxLength={50}
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                  placeholder="Describe your group (optional)"
                  className="textarea textarea-bordered"
                  maxLength={200}
                />
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Public Group</span>
                  <input
                    type="checkbox"
                    checked={newGroup.isPublic}
                    onChange={(e) => setNewGroup({...newGroup, isPublic: e.target.checked})}
                    className="checkbox checkbox-primary"
                  />
                </label>
                <label className="label">
                  <span className="label-text-alt">Public groups can be found in search</span>
                </label>
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroup.name.trim() || createGroupMutation.isLoading}
                  className="btn btn-primary"
                >
                  {createGroupMutation.isLoading ? (
                    <LoaderIcon className="animate-spin size-4" />
                  ) : (
                    'Create Group'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupsPage
