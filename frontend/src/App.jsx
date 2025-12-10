import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:4000/api';

function App() {
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ genre: '', plateforme: '' });

  const [form, setForm] = useState({
    titre: '',
    genreText: '',
    plateformeText: '',
    editeur: '',
    developpeur: '',
    annee_sortie: '',
    metacritic_score: '',
    temps_jeu_heures: '',
    termine: false
  });

  const [errors, setErrors] = useState([]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.genre) params.genre = filters.genre;
      if (filters.plateforme) params.plateforme = filters.plateforme;

      const res = await axios.get(`${API_URL}/games`, { params });
      setGames(res.data);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du chargement des jeux");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/stats`);
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGames();
    fetchStats();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setErrors([]);
    setForm({
      titre: '',
      genreText: '',
      plateformeText: '',
      editeur: '',
      developpeur: '',
      annee_sortie: '',
      metacritic_score: '',
      temps_jeu_heures: '',
      termine: false
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    const payload = {
      titre: form.titre,
      genre: form.genreText.split(',').map(g => g.trim()).filter(Boolean),
      plateforme: form.plateformeText.split(',').map(p => p.trim()).filter(Boolean),
      editeur: form.editeur || '',
      developpeur: form.developpeur || '',
      annee_sortie: form.annee_sortie ? Number(form.annee_sortie) : undefined,
      metacritic_score: form.metacritic_score ? Number(form.metacritic_score) : undefined,
      temps_jeu_heures: form.temps_jeu_heures ? Number(form.temps_jeu_heures) : 0,
      termine: form.termine
    };

    try {
      if (editingId) {
        const res = await axios.put(`${API_URL}/games/${editingId}`, payload);
        setGames(prev =>
          prev.map(g => (g.id === editingId ? res.data : g))
        );
      } else {
        const res = await axios.post(`${API_URL}/games`, payload);
        setGames(prev => [res.data, ...prev]);
      }
      await fetchStats();
      resetForm();
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.errors) {
        setErrors(err.response.data.errors);
      } else {
        alert("Erreur lors de l'enregistrement du jeu");
      }
    }
  };

  const handleEdit = (game) => {
    setEditingId(game.id);
    setErrors([]);
    setForm({
      titre: game.titre,
      genreText: game.genre.join(', '),
      plateformeText: game.plateforme.join(', '),
      editeur: game.editeur || '',
      developpeur: game.developpeur || '',
      annee_sortie: game.annee_sortie || '',
      metacritic_score: game.metacritic_score || '',
      temps_jeu_heures: game.temps_jeu_heures || '',
      termine: game.termine
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce jeu ?')) return;
    try {
      await axios.delete(`${API_URL}/games/${id}`);
      setGames(prev => prev.filter(g => g.id !== id));
      await fetchStats();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleFavorite = async (id) => {
    try {
      const res = await axios.post(`${API_URL}/games/${id}/favorite`);
      setGames(prev =>
        prev.map(g => (g.id === id ? res.data : g))
      );
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour des favoris');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = async () => {
    await fetchGames();
  };

  const clearFilters = async () => {
    setFilters({ genre: '', plateforme: '' });
    await fetchGames();
  };

  return (

    <div className="page">
      <div className="container">
        <header className="header">
          <h1 className="header-title">Collection de jeux vidéo</h1>
          <p className="header-subtitle">
            Gérez votre collection, filtrez vos jeux et suivez vos statistiques.
          </p>
        </header>

        {stats && (
          <section className="card">
            <h2 className="card-title">Statistiques</h2>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-label">Nombre total de jeux</div>
                <div className="stat-value">{stats.totalGames}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Temps de jeu total (heures)</div>
                <div className="stat-value">{stats.totalPlayTime}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Jeux terminés</div>
                <div className="stat-value">{stats.completedGames}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Score Metacritic moyen</div>
                <div className="stat-value">{stats.avgMetacritic}</div>
              </div>
            </div>
          </section>
        )}

        <section className="card">
          <h2 className="card-title">
            {editingId ? 'Modifier un jeu' : 'Ajouter un jeu'}
          </h2>

          {errors.length > 0 && (
            <div className="error-box">
              {errors.map((err, idx) => (
                <div key={idx}>• {err}</div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label">Titre</label>
              <input
                type="text"
                className="input"
                value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label className="label">Genre (séparés par des virgules)</label>
              <input
                type="text"
                className="input"
                value={form.genreText}
                onChange={e => setForm({ ...form, genreText: e.target.value })}
                placeholder="Action, RPG, Aventure"
              />
            </div>

            <div className="field">
              <label className="label">Plateforme (séparées par des virgules)</label>
              <input
                type="text"
                className="input"
                value={form.plateformeText}
                onChange={e => setForm({ ...form, plateformeText: e.target.value })}
                placeholder="PC, PS5, Switch"
              />
            </div>

            <div className="field">
              <label className="label">Éditeur</label>
              <input
                type="text"
                className="input"
                value={form.editeur}
                onChange={e => setForm({ ...form, editeur: e.target.value })}
              />
            </div>

            <div className="field">
              <label className="label">Développeur</label>
              <input
                type="text"
                className="input"
                value={form.developpeur}
                onChange={e => setForm({ ...form, developpeur: e.target.value })}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label className="label">Année de sortie</label>
                <input
                  type="number"
                  className="input"
                  value={form.annee_sortie}
                  onChange={e => setForm({ ...form, annee_sortie: e.target.value })}
                />
              </div>

              <div className="field">
                <label className="label">Score Metacritic</label>
                <input
                  type="number"
                  className="input"
                  value={form.metacritic_score}
                  onChange={e => setForm({ ...form, metacritic_score: e.target.value })}
                />
              </div>

              <div className="field">
                <label className="label">Temps de jeu (heures)</label>
                <input
                  type="number"
                  className="input"
                  value={form.temps_jeu_heures}
                  onChange={e => setForm({ ...form, temps_jeu_heures: e.target.value })}
                />
              </div>
            </div>

            <div className="checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={form.termine}
                  onChange={e => setForm({ ...form, termine: e.target.checked })}
                />{' '}
                Jeu terminé
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingId ? 'Enregistrer les modifications' : 'Ajouter le jeu'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetForm}
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="card">
          <h2 className="card-title">Filtres</h2>
          <div className="filters-row">
            <div className="field">
              <label className="label">Genre</label>
              <input
                type="text"
                name="genre"
                className="input"
                value={filters.genre}
                onChange={handleFilterChange}
                placeholder="RPG, Action..."
              />
            </div>
            <div className="field">
              <label className="label">Plateforme</label>
              <input
                type="text"
                name="plateforme"
                className="input"
                value={filters.plateforme}
                onChange={handleFilterChange}
                placeholder="PC, Switch..."
              />
            </div>
          </div>
          <div className="filters-actions">
            <button onClick={applyFilters} className="btn-primary btn-sm">
              Appliquer les filtres
            </button>
            <button onClick={clearFilters} className="btn-secondary btn-sm">
              Réinitialiser
            </button>
          </div>
        </section>

        <section className="card">
          <div className="export-row">
            <a
              href={`${API_URL}/games/export`}
              target="_blank"
              rel="noreferrer"
              className="export-link"
            >
              Exporter les jeux en JSON
            </a>
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Liste des jeux</h2>
          {loading && <p className="empty-state">Chargement...</p>}
          {!loading && games.length === 0 && (
            <p className="empty-state">Aucun jeu pour l'instant.</p>
          )}

          {!loading && games.length > 0 && (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Favori</th>
                    <th>Titre</th>
                    <th>Genre</th>
                    <th>Plateforme</th>
                    <th>Année</th>
                    <th>Metacritic</th>
                    <th>Temps (h)</th>
                    <th>Terminé</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map(game => (
                    <tr key={game.id}>
                      <td>
                        <button
                          className="btn-chip"
                          onClick={() => handleFavorite(game.id)}
                        >
                          {game.favorite ? 'Favori' : 'Standard'}
                        </button>
                      </td>
                      <td>{game.titre}</td>
                      <td>{game.genre.join(', ')}</td>
                      <td>{game.plateforme.join(', ')}</td>
                      <td>{game.annee_sortie || '-'}</td>
                      <td>{game.metacritic_score ?? '-'}</td>
                      <td>{game.temps_jeu_heures}</td>
                      <td>
                        {game.termine ? (
                          <span className="badge badge-yes">Terminé</span>
                        ) : (
                          <span className="badge badge-no">Non terminé</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleEdit(game)}
                          >
                            Modifier
                          </button>
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => handleDelete(game.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
