const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 4000;

// middleware 
app.use(cors());
app.use(express.json());


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.322sa.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const inventoryCollection = client.db('halalGrocery').collection('inventory');
        const restockCollection = client.db('halalGrocery').collection('restock');

        // AUTH
        app.post('/login', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        })

        // Inventory API
        app.get('/inventory', async (req, res) => {
            const query = {};
            const cursor = inventoryCollection.find(query);
            const inventories = await cursor.toArray();
            res.send(inventories);
        });

        // Inventory details
        app.get('/inventory/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const inventory = await inventoryCollection.findOne(query);
            res.send(inventory);
        });

        // Add Inventory items
        app.post('/inventory', async (req, res) => {
            const newInventory = req.body;
            const result = await inventoryCollection.insertOne(newInventory);
            res.send(result);
        });

        // Delete Inventory items
        app.delete('/inventory/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await inventoryCollection.deleteOne(query);
            res.send(result);
        });

        //My Items API
        app.get('/restock', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = restockCollection.find(query);
                const restocks = await cursor.toArray();
                res.send(restocks);
            }
            else {
                res.status(403).send({ message: 'forbidden access' })
            }
        })

        // Restock 
        app.post('/restock', async (req, res) => {
            const restock = req.body;
            const result = await restockCollection.insertOne(restock);
            res.send(result);
        })

        // Delivered
        app.put('/inventory/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body.update;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    ...data,
                },
            };
            const result = await inventoryCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            res.send(result);
        });
    }
    finally {

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Halal Gorcery Server Side');
});

app.listen(port, () => {
    console.log('Listening to port', port);
})