import { supabase } from './supabase'

export async function uploadPostImage(userId: string, file: File): Promise<string> {
  const fallbackExtension = file.type.split('/').pop() ?? 'jpg'
  const fileExt = file.name.split('.').pop() ?? fallbackExtension
  const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('post-images')
    .upload(fileName, file, {
      contentType: file.type || undefined,
    })

  if (uploadError) {
    throw uploadError
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('post-images').getPublicUrl(fileName)

  return publicUrl
}
