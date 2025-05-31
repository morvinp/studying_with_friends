import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import useAuthUser from '../hooks/useAuthUser'
import { CalendarIcon, EditIcon, MailIcon, UserIcon, CodeIcon, SaveIcon, XIcon, PlusIcon, ShuffleIcon, CameraIcon } from 'lucide-react'
import { getTechIcon } from '../components/FriendCard'
import PageLoader from '../components/PageLoader'
import { completeOnboarding } from '../lib/api'
import { TECHNOLOGIES } from '../constants'
import { toast } from 'react-hot-toast'

const ProfilePage = () => {
    const { authUser, isLoading } = useAuthUser()
    const queryClient = useQueryClient()
    const [isEditing, setIsEditing] = useState(false)
    
    // Form state for editing
    const [formState, setFormState] = useState({
        fullName: authUser?.fullName || "",
        bio: authUser?.bio || "",
        technologies: authUser?.technologies || [],
        profilePic: authUser?.profilePic || "",
    })
    const [selectedTech, setSelectedTech] = useState("")

    // Update form state when authUser changes
    React.useEffect(() => {
        if (authUser) {
            setFormState({
                fullName: authUser.fullName || "",
                bio: authUser.bio || "",
                technologies: authUser.technologies || [],
                profilePic: authUser.profilePic || "",
            })
        }
    }, [authUser])

    const { mutate: updateProfileMutation, isPending } = useMutation({
        mutationFn: completeOnboarding,
        onSuccess: () => {
            toast.success("Profile updated successfully")
            queryClient.invalidateQueries({ queryKey: ["authUser"] })
            setIsEditing(false)
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to update profile")
        }
    })

    if (isLoading) {
        return <PageLoader />
    }

    if (!authUser) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Not Found</h2>
                    <p className="text-base-content opacity-70">User profile not found</p>
                </div>
            </div>
        )
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const handleSave = (e) => {
        e.preventDefault()
        
        if (!formState.fullName.trim()) {
            toast.error("Full name is required")
            return
        }
        
        if (formState.technologies.length === 0) {
            toast.error("Please select at least one technology")
            return
        }
        
        updateProfileMutation(formState)
    }

    const handleCancel = () => {
        setFormState({
            fullName: authUser.fullName || "",
            bio: authUser.bio || "",
            technologies: authUser.technologies || [],
            profilePic: authUser.profilePic || "",
        })
        setSelectedTech("")
        setIsEditing(false)
    }

    const handleRandomAvatar = () => {
        const idx = Math.floor(Math.random() * 100) + 1
        const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`
        setFormState({ ...formState, profilePic: randomAvatar })
        toast.success("Random profile picture generated")
    }

    const addTechnology = () => {
        if (!selectedTech) {
            toast.error("Please select a technology")
            return
        }
        
        if (formState.technologies.includes(selectedTech)) {
            toast.error("Technology already added")
            return
        }
        
        if (formState.technologies.length >= 5) {
            toast.error("Maximum 5 technologies allowed")
            return
        }

        setFormState({
            ...formState,
            technologies: [...formState.technologies, selectedTech]
        })
        setSelectedTech("")
        toast.success("Technology added")
    }

    const removeTechnology = (techToRemove) => {
        setFormState({
            ...formState,
            technologies: formState.technologies.filter(tech => tech !== techToRemove)
        })
        toast.success("Technology removed")
    }

    return (
        <div className="min-h-screen bg-base-100 p-4 sm:p-6 lg:p-8">
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <h1 className="text-3xl font-bold">My Profile</h1>
                    
                    {!isEditing ? (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="btn btn-primary"
                        >
                            <EditIcon className="size-4 mr-2" />
                            Edit Profile
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button 
                                onClick={handleCancel}
                                className="btn btn-ghost"
                                disabled={isPending}
                            >
                                <XIcon className="size-4 mr-2" />
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                className="btn btn-primary"
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <>
                                        <span className="loading loading-spinner size-4 mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <SaveIcon className="size-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Profile Card */}
                <div className="card bg-base-200 shadow-xl">
                    <div className="card-body p-6 sm:p-8">
                        {/* Profile Header */}
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
                            <div className="flex flex-col items-center gap-4">
                                <div className="avatar">
                                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full">
                                        <img
                                            src={isEditing ? formState.profilePic : authUser.profilePic}
                                            alt={authUser.fullName}
                                            onError={(e) => {
                                                e.target.src = `https://avatar.iran.liara.run/public/${Math.floor(Math.random()*100)+1}.png`;
                                            }}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                                
                                {isEditing && (
                                    <button 
                                        type="button" 
                                        onClick={handleRandomAvatar} 
                                        className="btn btn-accent btn-sm"
                                    >
                                        <ShuffleIcon className="size-3 mr-1"/>
                                        Random Avatar
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex-1 text-center sm:text-left">
                                {isEditing ? (
                                    <div className="form-control w-full mb-4">
                                        <input
                                            type="text"
                                            value={formState.fullName}
                                            onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                                            className="input input-bordered text-2xl font-bold"
                                            placeholder="Your full name"
                                        />
                                    </div>
                                ) : (
                                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">{authUser.fullName}</h2>
                                )}
                                
                                <div className="flex flex-col sm:flex-row items-center gap-4 text-base-content opacity-70">
                                    <div className="flex items-center gap-2">
                                        <MailIcon className="size-4" />
                                        <span className="text-sm">{authUser.email}</span>
                                    </div>
                                    
                                    {authUser.createdAt && (
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="size-4" />
                                            <span className="text-sm">Joined {formatDate(authUser.createdAt)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bio Section */}
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <UserIcon className="size-5 text-primary" />
                                <h3 className="text-xl font-semibold">About</h3>
                            </div>
                            
                            {isEditing ? (
                                <div className="form-control">
                                    <textarea
                                        value={formState.bio}
                                        onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                                        className="textarea textarea-bordered h-24"
                                        placeholder="Tell others about yourself, your projects, and your learning goals"
                                    />
                                </div>
                            ) : (
                                authUser.bio ? (
                                    <div className="bg-base-100 rounded-lg p-4">
                                        <p className="text-base-content leading-relaxed">{authUser.bio}</p>
                                    </div>
                                ) : (
                                    <div className="bg-base-100 rounded-lg p-4 text-center">
                                        <p className="text-base-content opacity-50 italic">No bio added yet</p>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Technologies Section */}
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <CodeIcon className="size-5 text-primary" />
                                <h3 className="text-xl font-semibold">Technologies</h3>
                                {isEditing && (
                                    <span className="text-sm text-base-content opacity-70">
                                        (Select 1-5 technologies)
                                    </span>
                                )}
                            </div>
                            
                            {isEditing ? (
                                <div className="bg-base-100 rounded-lg p-4 space-y-4">
                                    {/* Technology Selector */}
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedTech}
                                            onChange={(e) => setSelectedTech(e.target.value)}
                                            className="select select-bordered flex-1"
                                            disabled={formState.technologies.length >= 5}
                                        >
                                            <option value="">Select a technology</option>
                                            {TECHNOLOGIES.filter(tech => !formState.technologies.includes(tech.toLowerCase())).map((tech) => (
                                                <option key={tech} value={tech.toLowerCase()}>
                                                    {tech}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={addTechnology}
                                            disabled={!selectedTech || formState.technologies.length >= 5}
                                            className="btn btn-primary"
                                        >
                                            <PlusIcon className="size-4" />
                                        </button>
                                    </div>

                                    {/* Selected Technologies */}
                                    <div className="flex flex-wrap gap-2">
                                        {formState.technologies.map((tech, index) => (
                                            <div
                                                key={index}
                                                className="badge badge-primary gap-2 p-3 text-sm"
                                            >
                                                {getTechIcon(tech)}
                                                {tech.charAt(0).toUpperCase() + tech.slice(1)}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTechnology(tech)}
                                                    className="btn btn-ghost btn-xs p-0 hover:bg-transparent"
                                                >
                                                    <XIcon className="size-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {formState.technologies.length === 0 && (
                                        <p className="text-sm text-base-content opacity-60">
                                            No technologies selected yet. Please add at least one.
                                        </p>
                                    )}

                                    {formState.technologies.length >= 5 && (
                                        <p className="text-sm text-warning">
                                            Maximum limit reached (5 technologies)
                                        </p>
                                    )}
                                </div>
                            ) : (
                                authUser.technologies && authUser.technologies.length > 0 ? (
                                    <div className="bg-base-100 rounded-lg p-4">
                                        <div className="flex flex-wrap gap-2">
                                            {authUser.technologies.map((tech, index) => (
                                                <span
                                                    key={index}
                                                    className="badge badge-primary badge-lg gap-2 p-3"
                                                >
                                                    {getTechIcon(tech)}
                                                    {tech.charAt(0).toUpperCase() + tech.slice(1)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-base-100 rounded-lg p-4 text-center">
                                        <p className="text-base-content opacity-50 italic">No technologies added yet</p>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Profile Stats - Only show in view mode */}
                        {!isEditing && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                                <div className="stat bg-base-100 rounded-lg">
                                    <div className="stat-title">Friends</div>
                                    <div className="stat-value text-2xl">{authUser.friends?.length || 0}</div>
                                    <div className="stat-desc">Connected developers</div>
                                </div>
                                
                                <div className="stat bg-base-100 rounded-lg">
                                    <div className="stat-title">Technologies</div>
                                    <div className="stat-value text-2xl">{authUser.technologies?.length || 0}</div>
                                    <div className="stat-desc">Skills & interests</div>
                                </div>
                                
                                <div className="stat bg-base-100 rounded-lg">
                                    <div className="stat-title">Profile Status</div>
                                    <div className={`stat-value text-2xl ${authUser.isOnBoarded ? 'text-success' : 'text-warning'}`}>
                                        {authUser.isOnBoarded ? '✓' : '⚠'}
                                    </div>
                                    <div className="stat-desc">
                                        {authUser.isOnBoarded ? 'Complete' : 'Incomplete'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Profile Incomplete Warning - Only show in view mode */}
                        {!isEditing && !authUser.isOnBoarded && (
                            <div className="alert alert-warning mt-6">
                                <div>
                                    <h3 className="font-bold">Complete Your Profile</h3>
                                    <div className="text-xs">Your profile is incomplete. Complete it to get better recommendations and connect with other developers.</div>
                                </div>
                                <div>
                                    <button onClick={() => setIsEditing(true)} className="btn btn-sm btn-warning">
                                        Complete Now
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProfilePage
