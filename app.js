// Bali Malayali DMC - B2B Travel Platform
// Main Application Logic

// Global state management
let currentUser = null;
let agents = JSON.parse(localStorage.getItem('agents') || '[]');
let quotes = JSON.parse(localStorage.getItem('quotes') || '[]');
let bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
let packages = JSON.parse(localStorage.getItem('packages') || '[]');

// Initialize default packages if empty
if (packages.length === 0) {
    packages = [
        {
            id: 'pkg1',
            name: 'Classic Bali Experience',
            duration: 5,
            locations: ['Seminyak', 'Ubud', 'Nusa Penida'],
            nights: [2, 2, 1],
            basePrice: 450,
            inclusions: ['Airport transfers', 'Daily breakfast', 'Sightseeing tours', 'Private vehicle']
        },
        {
            id: 'pkg2',
            name: 'Romantic Bali Honeymoon',
            duration: 6,
            locations: ['Seminyak', 'Ubud'],
            nights: [3, 3],
            basePrice: 650,
            inclusions: ['Airport transfers', 'Daily breakfast', 'Romantic dinner', 'Couple spa', 'Private vehicle']
        },
        {
            id: 'pkg3',
            name: 'Adventure Bali Explorer',
            duration: 7,
            locations: ['Seminyak', 'Ubud', 'Nusa Penida'],
            nights: [2, 3, 2],
            basePrice: 750,
            inclusions: ['Airport transfers', 'Daily breakfast', 'Adventure activities', 'Water sports', 'Private vehicle']
        }
    ];
    localStorage.setItem('packages', JSON.stringify(packages));
}

// Hotel data
const hotels = {
    'Seminyak': [
        { name: 'The Legian Bali', category: 'Luxury', pricePerNight: 180 },
        { name: 'W Bali Seminyak', category: 'Luxury', pricePerNight: 220 },
        { name: 'Aloft Bali Seminyak', category: 'Premium', pricePerNight: 120 },
        { name: 'Holiday Inn Express', category: 'Standard', pricePerNight: 80 }
    ],
    'Ubud': [
        { name: 'Four Seasons Resort Bali', category: 'Luxury', pricePerNight: 400 },
        { name: 'COMO Shambhala Estate', category: 'Luxury', pricePerNight: 350 },
        { name: 'Alaya Resort Ubud', category: 'Premium', pricePerNight: 150 },
        { name: 'Ubud Village Hotel', category: 'Standard', pricePerNight: 90 }
    ],
    'Nusa Penida': [
        { name: 'Adiwana Bee House', category: 'Premium', pricePerNight: 100 },
        { name: 'Penida Colada Beach Bar', category: 'Standard', pricePerNight: 70 },
        { name: 'Semabu Hills Hotel', category: 'Standard', pricePerNight: 60 }
    ]
};

// Add-ons data
const addOns = [
    { id: 'rafting', name: 'White Water Rafting', price: 35 },
    { id: 'spa', name: 'Balinese Spa Treatment', price: 45 },
    { id: 'dirtbike', name: 'Dirt Bike Adventure', price: 55 },
    { id: 'cooking', name: 'Cooking Class', price: 40 },
    { id: 'volcano', name: 'Mount Batur Sunrise Trek', price: 50 },
    { id: 'snorkeling', name: 'Snorkeling Tour', price: 30 }
];

// Tier system
const tiers = {
    'Bronze': { minPax: 0, discount: 0 },
    'Silver': { minPax: 10, discount: 10 },
    'Gold': { minPax: 30, discount: 15 },
    'Platinum': { minPax: 50, discount: 20 }
};

// Utility functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveData() {
    localStorage.setItem('agents', JSON.stringify(agents));
    localStorage.setItem('quotes', JSON.stringify(quotes));
    localStorage.setItem('bookings', JSON.stringify(bookings));
    localStorage.setItem('packages', JSON.stringify(packages));
}

function getCurrentUser() {
    const userId = localStorage.getItem('currentUserId');
    return agents.find(agent => agent.id === userId);
}

function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('currentUserId', user.id);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUserId');
    window.location.href = 'index.html';
}

// Modal functions
function showLogin() {
    document.getElementById('loginModal').classList.remove('hidden');
}

function hideLogin() {
    document.getElementById('loginModal').classList.add('hidden');
}

function showRegister() {
    document.getElementById('registerModal').classList.remove('hidden');
}

function hideRegister() {
    document.getElementById('registerModal').classList.add('hidden');
}

function scrollToFeatures() {
    document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
}

// Authentication functions
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const agent = agents.find(a => a.email === email && a.password === password);
    
    if (agent) {
        if (agent.status === 'approved') {
            setCurrentUser(agent);
            window.location.href = 'dashboard.html';
        } else {
            alert('Your account is pending approval. We will contact you on WhatsApp once approved.');
        }
    } else {
        alert('Invalid email or password');
    }
}

function handleRegister(event) {
    event.preventDefault();
    
    const formData = {
        id: generateId(),
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        contactPerson: document.getElementById('contactPerson').value,
        whatsapp: document.getElementById('whatsapp').value,
        companyName: document.getElementById('companyName').value,
        businessType: document.getElementById('businessType').value,
        socialMedia: document.getElementById('socialMedia').value,
        website: document.getElementById('website').value,
        tier: 'Bronze',
        perPersonDiscount: 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        paxThisMonth: 0,
        totalRevenue: 0,
        quotesGenerated: 0,
        bookingsConfirmed: 0
    };
    
    // Check if email already exists
    if (agents.find(a => a.email === formData.email)) {
        alert('Email already registered');
        return;
    }
    
    agents.push(formData);
    saveData();
    
    hideRegister();
    alert('Thanks for registering! We\'ll contact you on WhatsApp once approved.');
}

// Quote calculation functions
function calculateRooms(adults, childWithBed, childWithoutBed) {
    const totalPaxWithBed = adults + childWithBed;
    const rooms = Math.ceil(totalPaxWithBed / 2);
    const extraBeds = Math.max(0, totalPaxWithBed - (rooms * 2));
    
    return { rooms, extraBeds };
}

function selectVehicle(totalPax) {
    if (totalPax <= 6) return { type: 'Avanza', capacity: 6, pricePerDay: 35 };
    if (totalPax <= 8) return { type: 'Innova', capacity: 8, pricePerDay: 45 };
    return { type: 'ELF', capacity: 15, pricePerDay: 65 };
}

function calculateTierDiscount(agent, basePrice) {
    const tier = agent.tier || 'Bronze';
    const discount = tiers[tier].discount;
    return basePrice - discount;
}

function calculateQuotePrice(packageData, options, pax, agent) {
    let totalPrice = 0;
    
    // Base package price
    totalPrice += packageData.basePrice * pax.total;
    
    // Hotel costs
    options.hotels.forEach((hotel, index) => {
        const nights = packageData.nights[index];
        const roomCalc = calculateRooms(pax.adults, pax.childWithBed, pax.childWithoutBed);
        totalPrice += hotel.pricePerNight * nights * roomCalc.rooms;
    });
    
    // Vehicle costs
    const vehicle = selectVehicle(pax.total);
    totalPrice += vehicle.pricePerDay * packageData.duration;
    
    // Add-ons
    options.addOns.forEach(addOn => {
        totalPrice += addOn.price * pax.total;
    });
    
    // Apply tier discount
    const discountedPrice = calculateTierDiscount(agent, totalPrice);
    
    // Apply agent markup
    const finalPrice = discountedPrice + (options.markup || 0);
    
    return {
        basePrice: totalPrice,
        tierDiscount: totalPrice - discountedPrice,
        markup: options.markup || 0,
        finalPrice: finalPrice
    };
}

// Quote generation
function generateQuote(quoteData) {
    const quote = {
        id: generateId(),
        agentId: currentUser.id,
        clientName: quoteData.clientName,
        travelDates: quoteData.travelDates,
        pax: quoteData.pax,
        options: quoteData.options,
        createdAt: new Date().toISOString(),
        status: 'draft'
    };
    
    quotes.push(quote);
    
    // Update agent stats
    const agentIndex = agents.findIndex(a => a.id === currentUser.id);
    agents[agentIndex].quotesGenerated++;
    
    saveData();
    return quote;
}

// PDF generation (simplified)
function generatePDF(quote) {
    const agent = agents.find(a => a.id === quote.agentId);
    
    // This would integrate with a PDF library in a real implementation
    const pdfContent = {
        agentInfo: {
            name: agent.contactPerson,
            company: agent.companyName,
            email: agent.email,
            whatsapp: agent.whatsapp
        },
        clientName: quote.clientName,
        travelDates: quote.travelDates,
        options: quote.options,
        terms: 'Standard terms and conditions apply...'
    };
    
    // For demo purposes, we'll create a downloadable text file
    const content = JSON.stringify(pdfContent, null, 2);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `quote-${quote.id}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
}

// Admin functions
function approveAgent(agentId) {
    const agentIndex = agents.findIndex(a => a.id === agentId);
    if (agentIndex !== -1) {
        agents[agentIndex].status = 'approved';
        saveData();
        alert('Agent approved successfully');
        loadAdminDashboard();
    }
}

function rejectAgent(agentId) {
    const agentIndex = agents.findIndex(a => a.id === agentId);
    if (agentIndex !== -1) {
        agents.splice(agentIndex, 1);
        saveData();
        alert('Agent rejected and removed');
        loadAdminDashboard();
    }
}

// Monthly automation (would be triggered by cron job in real implementation)
function monthlyReset() {
    agents.forEach(agent => {
        // Update tier based on pax this month
        let newTier = 'Bronze';
        if (agent.paxThisMonth >= 50) newTier = 'Platinum';
        else if (agent.paxThisMonth >= 30) newTier = 'Gold';
        else if (agent.paxThisMonth >= 10) newTier = 'Silver';
        
        agent.tier = newTier;
        agent.perPersonDiscount = tiers[newTier].discount;
        agent.paxThisMonth = 0; // Reset for new month
    });
    
    saveData();
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    currentUser = getCurrentUser();
    
    // Bind form events if elements exist
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Close modals when clicking outside
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('fixed')) {
            hideLogin();
            hideRegister();
        }
    });
});

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateId,
        calculateRooms,
        selectVehicle,
        calculateQuotePrice,
        generateQuote,
        generatePDF,
        approveAgent,
        rejectAgent,
        monthlyReset
    };
}