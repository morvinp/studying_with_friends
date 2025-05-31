import React from 'react'
import { Link } from 'react-router'

const FriendCard = ({friend}) => {
  return (
    <div className='card bg-base-200 hover:shadow-md transition-shadow'>
        <div className='card-body p-4'>
            <div className="flex items-center gap-3 mb-3">
                <div className="avatar size-12">
                    <img 
                        src={friend.profilePic} 
                        alt={friend.fullName}
                        onError={(e) => {
                            e.target.src = `https://avatar.iran.liara.run/public/${Math.floor(Math.random()*100)+1}.png`;
                        }}
                    />
                </div>
                <h3 className="font-semibold truncate">{friend.fullName}</h3>
            </div>
            
            {/* TECHNOLOGIES BADGES */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                {friend.technologies && friend.technologies.length > 0 ? (
                    friend.technologies.map((tech, index) => (
                        <span key={index} className="badge badge-primary text-xs">
                            {getTechIcon(tech)}
                            {tech.charAt(0).toUpperCase() + tech.slice(1)}
                        </span>
                    ))
                ) : (
                    <span className="badge badge-ghost text-xs">
                        No technologies listed
                    </span>
                )}
            </div>

            {friend.bio && (
                <p className="text-xs text-base-content opacity-70 mb-3 line-clamp-2">
                    {friend.bio}
                </p>
            )}

            <Link to={`/chat/${friend._id}`} className='btn btn-outline w-full'>
                Message
            </Link>
        </div>
    </div>
  )
}

export default FriendCard

export function getTechIcon(tech) {
    const techIcons = {
        'javascript': '⚡',
        'typescript': '📘',
        'react': '⚛️',
        'vue.js': '💚',
        'angular': '🅰️',
        'svelte': '🧡',
        'next.js': '▲',
        'node.js': '🟢',
        'python': '🐍',
        'java': '☕',
        'go': '🐹',
        'rust': '🦀',
        'docker': '🐳',
        'mongodb': '🍃',
        'postgresql': '🐘',
        'aws': '☁️',
        'git': '📚'
    };
    
    const icon = techIcons[tech.toLowerCase()];
    return icon ? <span className="mr-1">{icon}</span> : <span className="mr-1">💻</span>;
}
