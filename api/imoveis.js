import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('SUPABASE_URL:', url)
    console.log('HAS_SERVICE_ROLE:', !!key)

    if (!url || !key) {
        return res.status(500).json({
            error: 'Missing env vars',
            hasUrl: !!url,
            hasServiceRole: !!key
        })
    }

    const supabase = createClient(url, key)

    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .limit(5)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
}