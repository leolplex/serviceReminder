import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseIsConfigured = Boolean(url && publishableKey)
export const supabase = supabaseIsConfigured ? createClient(url, publishableKey) : null
