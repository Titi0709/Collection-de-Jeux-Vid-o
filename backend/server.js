const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'game_collection_db';
const COLLECTION_NAME = 'games';

let db;
let gamesCollection;

const gameSchema = {
    titre: { type: 'string', required: true, minLength: 1 },
    genre: { type: 'array', required: true, minItems: 1 },
    plateforme: { type: 'array', required: true, minItems: 1 },
    annee_sortie: { type: 'number', min: 1970, max: new Date().getFullYear() },
    metacritic_score: { type: 'number', min: 0, max: 100 },
    temps_jeu_heures: { type: 'number', min: 0 }
};

function validateGame(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.titre !== undefined) {
        if (typeof data.titre !== 'string' || data.titre.trim().length < 1) {
            errors.push('Le champ "titre" est obligatoire et doit être une chaîne non vide.');
        }
    }

    if (!isUpdate || data.genre !== undefined) {
        if (!Array.isArray(data.genre) || data.genre.length < 1) {
            errors.push('Le champ "genre" doit être un tableau avec au moins un élément.');
        }
    }

    if (!isUpdate || data.plateforme !== undefined) {
        if (!Array.isArray(data.plateforme) || data.plateforme.length < 1) {
            errors.push('Le champ "plateforme" doit être un tableau avec au moins un élément.');
        }
    }

    if (data.annee_sortie !== undefined) {
        if (typeof data.annee_sortie !== 'number') {
            errors.push('"annee_sortie" doit être un nombre.');
        } else if (data.annee_sortie < gameSchema.annee_sortie.min || data.annee_sortie > gameSchema.annee_sortie.max) {
            errors.push(`"annee_sortie" doit être entre ${gameSchema.annee_sortie.min} et ${gameSchema.annee_sortie.max}.`);
        }
    }

    if (data.metacritic_score !== undefined) {
        if (typeof data.metacritic_score !== 'number') {
            errors.push('"metacritic_score" doit être un nombre.');
        } else if (data.metacritic_score < gameSchema.metacritic_score.min || data.metacritic_score > gameSchema.metacritic_score.max) {
            errors.push(`"metacritic_score" doit être entre ${gameSchema.metacritic_score.min} et ${gameSchema.metacritic_score.max}.`);
        }
    }

    if (data.temps_jeu_heures !== undefined) {
        if (typeof data.temps_jeu_heures !== 'number') {
            errors.push('"temps_jeu_heures" doit être un nombre.');
        } else if (data.temps_jeu_heures < gameSchema.temps_jeu_heures.min) {
            errors.push(`"temps_jeu_heures" doit être >= ${gameSchema.temps_jeu_heures.min}.`);
        }
    }

    return errors;
}

function mapGame(doc) {
    return {
        id: doc._id.toString(),
        titre: doc.titre,
        genre: doc.genre,
        plateforme: doc.plateforme,
        editeur: doc.editeur || '',
        developpeur: doc.developpeur || '',
        annee_sortie: doc.annee_sortie || null,
        metacritic_score: doc.metacritic_score || null,
        temps_jeu_heures: doc.temps_jeu_heures || 0,
        termine: doc.termine ?? false,
        favorite: doc.favorite ?? false,
        date_ajout: doc.date_ajout,
        date_modification: doc.date_modification
    };
}

app.post('/api/games', async (req, res) => {
    try {
        const data = req.body;

        const errors = validateGame(data, false);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const now = new Date();

        const game = {
            titre: data.titre,
            genre: data.genre,
            plateforme: data.plateforme,
            editeur: data.editeur || '',
            developpeur: data.developpeur || '',
            annee_sortie: data.annee_sortie || null,
            metacritic_score: data.metacritic_score || null,
            temps_jeu_heures: data.temps_jeu_heures || 0,
            termine: data.termine ?? false,
            favorite: false,
            date_ajout: now,
            date_modification: now
        };

        const result = await gamesCollection.insertOne(game);
        const inserted = await gamesCollection.findOne({ _id: result.insertedId });
        res.status(201).json(mapGame(inserted));
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/games', async (req, res) => {
    try {
        const { genre, plateforme, termine } = req.query;
        const filter = {};

        if (genre) filter.genre = { $in: [genre] };
        if (plateforme) filter.plateforme = { $in: [plateforme] };
        if (termine !== undefined) filter.termine = termine === 'true';

        const docs = await gamesCollection.find(filter).sort({ date_ajout: -1 }).toArray();
        res.json(docs.map(mapGame));
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/games/export', async (req, res) => {
    try {
        const docs = await gamesCollection.find({}).toArray();
        const games = docs.map(mapGame);
        res.setHeader('Content-Disposition', 'attachment; filename="games_export.json"');
        res.json(games);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/games/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const doc = await gamesCollection.findOne({ _id: new ObjectId(id) });
        if (!doc) {
            return res.status(404).json({ error: 'Jeu non trouvé' });
        }

        res.json(mapGame(doc));
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/games/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const errors = validateGame(data, false);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const now = new Date();

        const updateFields = {
            titre: data.titre,
            genre: data.genre,
            plateforme: data.plateforme,
            editeur: data.editeur || '',
            developpeur: data.developpeur || '',
            annee_sortie: data.annee_sortie || null,
            metacritic_score: typeof data.metacritic_score === 'number' ? data.metacritic_score : null,
            temps_jeu_heures: typeof data.temps_jeu_heures === 'number' ? data.temps_jeu_heures : 0,
            termine: data.termine ?? false,
            date_modification: now
        };

        const existing = await gamesCollection.findOne({ _id: new ObjectId(id) });
        if (!existing) {
            return res.status(404).json({ error: 'Jeu non trouvé' });
        }

        if (data.favorite === undefined) {
            updateFields.favorite = existing.favorite ?? false;
        } else {
            updateFields.favorite = data.favorite;
        }

        await gamesCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateFields }
        );

        const updated = await gamesCollection.findOne({ _id: new ObjectId(id) });

        res.json(mapGame(updated));
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/games/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const result = await gamesCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Jeu non trouvé' });
        }

        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/games/:id/favorite', async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID invalide' });
        }

        const objectId = new ObjectId(id);
        const game = await gamesCollection.findOne({ _id: objectId });
        if (!game) {
            return res.status(404).json({ error: 'Jeu non trouvé' });
        }

        const newFavorite = !(game.favorite ?? false);

        await gamesCollection.updateOne(
            { _id: objectId },
            {
                $set: {
                    favorite: newFavorite,
                    date_modification: new Date()
                }
            }
        );

        const updated = await gamesCollection.findOne({ _id: objectId });

        return res.json(mapGame(updated));
    } catch (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const games = await gamesCollection.find({}).toArray();

        const totalGames = games.length;
        const totalPlayTime = games.reduce((acc, g) => acc + (g.temps_jeu_heures || 0), 0);
        const completedGames = games.filter(g => g.termine).length;
        const avgMetacritic =
            totalGames > 0
                ? games.reduce((acc, g) => acc + (g.metacritic_score || 0), 0) / totalGames
                : 0;

        res.json({
            totalGames,
            totalPlayTime,
            completedGames,
            avgMetacritic: Number(avgMetacritic.toFixed(1))
        });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

async function start() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(DB_NAME);
        gamesCollection = db.collection(COLLECTION_NAME);

        console.log('Connecté à MongoDB');

        const PORT = 4000;
        app.listen(PORT, () => {
            console.log(`API démarrée sur http://localhost:${PORT}`);
        });
    } catch (err) {
        process.exit(1);
    }
}

start();
