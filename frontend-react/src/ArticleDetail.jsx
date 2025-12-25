import React, {useEffect, useState} from 'react';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { useParams, Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

export default function ArticleDetail(){
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(()=>{
    setLoading(true);
    axios.get(`${API_BASE}/articles/${id}`).then(res=>{
      setArticle(res.data);
      setLoading(false);
    }).catch(err=>{ setError(err.message || String(err)); setLoading(false); });
  },[id]);

  if (loading) return <div className="container">Loading...</div>;
  if (error) return <div className="container">Error: {error}</div>;
  if (!article) return <div className="container">Article not found</div>;

  const isUpdated = (article.body || '').includes('References') || (article.body || '').includes('<h3>References');

  return (
    <div className="container">
      <Link to="/" style={{textDecoration:'none', color:'#555'}}>← Back</Link>
      <h1>{article.title} {isUpdated && <span className="badge">Updated</span>}</h1>
      <p className="meta">
        {article.source_url && <a href={article.source_url} target="_blank" rel="noreferrer">Source</a>} 
        {article.published_at && <> • {new Date(article.published_at).toLocaleString()}</>}
      </p>

      <div className="article-body" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(article.body || '')}} />

    </div>
  )
}
