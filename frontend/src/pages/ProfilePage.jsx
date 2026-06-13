import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { userApi } from '@/utils/api'
import TemplateCard from '@/components/templates/TemplateCard'
import { Spinner, Empty } from '@/components/ui'
import { Layers, GitFork } from 'lucide-react'

export default function ProfilePage() {
  const { username } = useParams()

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user', username],
    queryFn: () => userApi.get(username),
  })

  const { data: templatesData, isLoading: tplLoading } = useQuery({
    queryKey: ['user-templates-public', username],
    queryFn: () => userApi.templates(username),
    enabled: !!user,
  })

  if (userLoading) return <div className="flex justify-center py-32"><Spinner size={28} /></div>
  if (!user) return <div className="text-center py-32 text-dark-700/50">User not found.</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Profile header */}
      <div className="flex items-start gap-5 mb-10">
        <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center
                        text-white font-display font-bold text-2xl shrink-0">
          {user.username[0].toUpperCase()}
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-dark-950">{user.full_name || user.username}</h1>
          <p className="text-dark-700/50 text-sm">@{user.username}</p>
          {user.bio && <p className="text-dark-700/70 mt-2 max-w-xl">{user.bio}</p>}
        </div>
      </div>

      <div>
        <h2 className="section-title mb-5">Templates</h2>
        {tplLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : templatesData?.items?.length === 0 ? (
          <Empty icon={Layers} title="No templates yet" message="This user hasn't published any templates." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {templatesData?.items?.map((t) => <TemplateCard key={t.id} template={t} />)}
          </div>
        )}
      </div>
    </div>
  )
}
