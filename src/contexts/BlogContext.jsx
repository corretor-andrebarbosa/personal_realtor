
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const BlogContext = createContext();

export const useBlog = () => useContext(BlogContext);

export const BlogProvider = ({ children }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadPosts = async () => {
        setLoading(true);
        if (supabase) {
            const { data, error } = await supabase
                .from('blog_posts')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data) setPosts(data);
        }
        setLoading(false);
    };

    useEffect(() => { loadPosts(); }, []);

    const addPost = async (post) => {
        if (!supabase) return false;
        const { data, error } = await supabase.from('blog_posts').insert([post]).select();
        if (!error && data) {
            setPosts(prev => [data[0], ...prev]);
            return true;
        }
        return error?.message || 'Erro ao salvar';
    };

    const updatePost = async (id, updated) => {
        if (!supabase) return false;
        const payload = { ...updated, updated_at: new Date().toISOString() };
        const { error } = await supabase.from('blog_posts').update(payload).eq('id', id);
        if (!error) {
            setPosts(prev => prev.map(p => p.id === id ? { ...p, ...payload } : p));
            return true;
        }
        return error?.message || 'Erro ao atualizar';
    };

    const deletePost = async (id) => {
        setPosts(prev => prev.filter(p => p.id !== id));
        if (supabase) await supabase.from('blog_posts').delete().eq('id', id);
    };

    return (
        <BlogContext.Provider value={{ posts, loading, addPost, updatePost, deletePost, refreshPosts: loadPosts }}>
            {children}
        </BlogContext.Provider>
    );
};
