const prisma = require('../prismaClient');
const logger = require('../utils/logger');

const getProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: {
                name: 'asc'
            }
        });
        res.status(200).json(products);
    } catch (error) {
        logger.error('Failed to get products:', error);
        res.status(500).json({ message: 'Failed to retrieve products.' });
    }
};

module.exports = {
    getProducts,
}; 