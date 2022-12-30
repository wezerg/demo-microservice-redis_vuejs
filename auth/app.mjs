import { createClient } from 'redis';
import express from 'express';
import cookieParser from 'cookie-parser';
import crypt from 'bcrypt';

const app = express();

const client = createClient({url: 'redis://redis'});
client.on('error', (err) => console.log('Redis Client Error', err));
await client.connect();
await client.SET('incrementalid', 0);

app.use(express.json()); // Middleware Express Json
app.use(cookieParser()); // Middleware Express Json

// Déclaration des routes ici
app.post('/auth/login', async (req, res, next) => {
    if (req.body.username && req.body.password) {
        /**
         * Lire les HASH dans redis pour trouver l'utilisateur
         * Comparer mot de passe donnée par celui contenue dans le HASH
         * Renvoyer son idSession dans le cookie à la place de "Hello world"
         */
        res.status(200).cookie('auth-chat-app', 'Hello world').send({username: req.body.username});   
    }
    else{
        next("Veuillez renseigner un pseudo et un mot de passe");
    }
});
app.post('/auth/register', async (req, res, next) => {
    if (req.body.username && req.body.password && req.body.confirmPassword) {
        if (req.body.password === req.body.confirmPassword) {
            const existingUser = parseInt(await client.EXISTS(`users:${req.body.username}`));
            if (!existingUser) {
                const idIncrement = await client.INCR('incrementalid', 1);
                if (idIncrement) {
                    const salt = await crypt.genSalt(10);
                    const passwordHash = await crypt.hash(req.body.password, salt);
                    const hash = await client.HSET(`users:${idIncrement}`, {username: req.body.username, password: passwordHash});
                    if (hash) {
                        await client.SET(`users:${req.body.username}`, '1');
                        res.status(200).cookie('auth-chat-app', idIncrement).send({username: req.body.username});   
                    }          
                }                
            }
            else{
                next('Un utilisateur avec ce pseudo existe déja');
            }
        }
        else{
            next("Le mot de passe et sa confirmation ne correspondent pas");
        }
    }
    else{
        next("Veuillez renseigner un pseudo, un mot de passe et sa confirmation");
    }
});
app.get('/auth/auto', async (req, res, next) => {
    if (req.cookies['auth-chat-app']) {
        /**
         * Récupérer le cookie "sessionId" envoyé par le front-end
         * Rechercher le hash de l'utilisateur par son sessionId
         * Renvoyer l'utilisateur trouvé
         */
        console.log(req.cookies);
        res.status(200).send("Connecté");        
    }
    else{
        next('Cookie de session inexistant');
    }
});

// Middleware d'erreur général 400
app.use((err, req, res, next) => {
    res.status(400).send(err);
});

// Ecoute du serveur sur le port 3000
app.listen(3000);