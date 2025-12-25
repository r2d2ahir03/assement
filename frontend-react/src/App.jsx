import React, {useEffect, useState} from 'react';
import axios from 'axios';
import { Link, Routes, Route } from 'react-router-dom';
import ArticleDetail from './ArticleDetail';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

function ListView(){
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');

  useEffect(()=>{
    setLoading(true);
    axios.get(`${API_BASE}/articles`).then(res=>{
      setArticles(res.data.data || res.data);
      setLoading(false);
      setError(null);
    }).catch((err)=>{
      console.error('Error fetching articles', err.message || err);
      setError(err.message || String(err));
      setLoading(false);
    });
  },[]);

  const filtered = articles.filter(a => !q || a.title.toLowerCase().includes(q.toLowerCase()) || (a.excerpt||'').toLowerCase().includes(q.toLowerCase()));

  if(loading) return <div className="container">Loading...</div>

  if(error) return (
    <div className="container">
      <h1>Articles</h1>
      <div className="card" style={{background:'#fff7f7'}}>
        <p><strong>Unable to fetch articles:</strong> {error}</p>
        <p>Make sure the API is running at <code>{API_BASE}</code> and accessible from this machine.</p>
      </div>
    </div>
  )

  return (
    <div className="container">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <h1>Articles</h1>
        <input style={{padding:'6px 10px',borderRadius:6,border:'1px solid #ddd'}} placeholder="Search titles or excerpts" value={q} onChange={e=>setQ(e.target.value)} />
      </div>
      <div className="grid">
        {filtered.map(a=> (
          <article key={a.id} className="card">
            <h2>{a.title}</h2>
            <p className="excerpt">{a.excerpt}</p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
              <Link to={`/articles/${a.id}`}>View →</Link>
              {(a.body || '').includes('References') && <span className="badge">Updated</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default function App(){
  return (
    <Routes>
      <Route path="/" element={<ListView/>} />
      <Route path="/articles/:id" element={<ArticleDetail/>} />
    </Routes>
  )
}
