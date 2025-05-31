import React, { useState } from 'react'
import useAuthUser from '../hooks/useAuthUser'
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { completeOnboarding } from '../lib/api';
import { CameraIcon, LoaderIcon, ShipWheelIcon, ShuffleIcon, XIcon, PlusIcon } from "lucide-react";
import { toast } from 'react-hot-toast';
import { TECHNOLOGIES } from '../constants';

const OnboardingPage = () => {
  const {authUser} = useAuthUser();
  const queryClient = useQueryClient(); 

  const [formState, setFormState] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    technologies: authUser?.technologies || [],
    profilePic: authUser?.profilePic || "",
  });

  const [selectedTech, setSelectedTech] = useState("");

  const { mutate: onboardingMutation, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: ()=> {
      toast.success("Profile onboarded successfully");
      queryClient.invalidateQueries({queryKey:["authUser"]}); 
    },
    onError: (error)=>{
      toast.error(error.response.data.message);
      console.log(error);
    }
  })

  const handleSubmit = (e)=>{
    e.preventDefault();
    
    if (!formState.fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    
    if (formState.technologies.length === 0) {
      toast.error("Please select at least one technology");
      return;
    }
    
    onboardingMutation(formState);
  }

  const handleRandomAvatar = ()=>{
    const idx = Math.floor(Math.random()*100 )+1;
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;
    setFormState({ ...formState, profilePic: randomAvatar});
    toast.success("Random Profile pic generated");
  }

  const addTechnology = () => {
    if (!selectedTech) {
      toast.error("Please select a technology");
      return;
    }
    
    if (formState.technologies.includes(selectedTech)) {
      toast.error("Technology already added");
      return;
    }
    
    if (formState.technologies.length >= 5) {
      toast.error("Maximum 5 technologies allowed");
      return;
    }

    setFormState({
      ...formState,
      technologies: [...formState.technologies, selectedTech]
    });
    setSelectedTech("");
    toast.success("Technology added");
  };

  const removeTechnology = (techToRemove) => {
    setFormState({
      ...formState,
      technologies: formState.technologies.filter(tech => tech !== techToRemove)
    });
    toast.success("Technology removed");
  };

  return (
    <div className='min-h-screen bg-base-100 flex items-center justify-center p-4'>
      <div className='card bg-base-200 w-full max-w-3xl shadow-xl'>
        <div className='card-body p-6 sm:p-8'>
          <h1 className='text-2xl sm:text-3xl font-bold text-center mb-6'>Complete Your Profile</h1>

          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* PROFILE PIC CONTAINER */}
            <div className='flex flex-col items-center justify-center space-y-4'>
              <div className="size-32 rounded-full bg-base-300 overflow-hidden">
                {formState.profilePic ? (
                  <img
                    src={formState.profilePic}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <CameraIcon className="size-12 text-base-content opacity-40" />
                  </div>
                )}
              </div>
              
              <div className='flex items-center gap-2'>
                <button type="button" onClick={handleRandomAvatar} className='btn btn-accent'>
                  <ShuffleIcon className="size-4 mr-2"/>
                  Generate Random Avatar
                </button>
              </div>
            </div>

            {/* FULL NAME */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Full Name <span className="text-error">*</span></span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formState.fullName}
                onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                className="input input-bordered w-full"
                placeholder="Your full name"
                required
              />
            </div>

            {/* BIO */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Bio</span>
              </label>
              <textarea
                name="bio"
                value={formState.bio}
                onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                className="textarea textarea-bordered h-24"
                placeholder="Tell others about yourself, your projects, and your learning goals"
              />
            </div>

            {/* TECHNOLOGIES SECTION */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  Technologies <span className="text-error">*</span>
                  <span className="text-sm text-base-content opacity-70 ml-2">
                    (Select 1-5 technologies you use or want to learn)
                  </span>
                </span>
              </label>
              
              <div className="flex gap-2 mb-3">
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

              <div className="flex flex-wrap gap-2">
                {formState.technologies.map((tech, index) => (
                  <div
                    key={index}
                    className="badge badge-primary gap-2 p-3 text-sm"
                  >
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
                <p className="text-sm text-base-content opacity-60 mt-2">
                  No technologies selected yet. Please add at least one.
                </p>
              )}

              {formState.technologies.length >= 5 && (
                <p className="text-sm text-warning mt-2">
                  Maximum limit reached (5 technologies)
                </p>
              )}
            </div>
            
            <button className='btn btn-primary w-full' disabled={isPending} type='submit'>
              {!isPending ? (
                <>
                <ShipWheelIcon className='size-5 mr-2'/>
                Complete Onboarding
                </>
              ) : (
                <>
                <LoaderIcon className='animate-spin size-5 mr-2'/>
                Onboarding...
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default OnboardingPage
