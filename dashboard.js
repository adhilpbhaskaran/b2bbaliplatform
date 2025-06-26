// Dashboard specific functionality

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuthAndLoadDashboard();
});

function checkAuthAndLoadDashboard() {
    currentUser = getCurrentUser();
    
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    if (currentUser.status !== 'approved') {
        showApprovalPending();
        return;
    }
    
    loadDashboard();
}

function showApprovalPending() {
    document.getElementById('approvalModal').classList.remove('hidden');
}

function loadDashboard() {
    // Update user name displays
    document.getElementById('userName').textContent = currentUser.contactPerson;
    document.getElementById('welcomeName').textContent = currentUser.contactPerson;
    
    // Load statistics
    loadStatistics();
    
    // Load tier information
    loadTierInfo();
    
    // Load recent activity
    loadRecentActivity();
}

function loadStatistics() {
    const userQuotes = quotes.filter(q => q.agentId === currentUser.id);
    const userBookings = bookings.filter(b => b.agentId === currentUser.id);
    
    // Calculate monthly revenue (simplified)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyBookings = userBookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
    });
    
    const monthlyRevenue = monthlyBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
    
    // Update statistics display
    document.getElementById('monthlyRevenue').textContent = `$${monthlyRevenue.toLocaleString()}`;
    document.getElementById('quotesCount').textContent = userQuotes.length;
    document.getElementById('bookingsCount').textContent = userBookings.length;
    
    // Calculate conversion rate
    const conversionRate = userQuotes.length > 0 ? ((userBookings.length / userQuotes.length) * 100).toFixed(1) : 0;
    document.getElementById('conversionRate').textContent = `${conversionRate}%`;
    
    // Update quick stats
    document.getElementById('paxThisMonth').textContent = currentUser.paxThisMonth || 0;
    document.getElementById('totalRevenue').textContent = `$${(currentUser.totalRevenue || 0).toLocaleString()}`;
    document.getElementById('activeQuotes').textContent = userQuotes.filter(q => q.status === 'sent').length;
    document.getElementById('pendingBookings').textContent = userBookings.filter(b => b.status === 'pending').length;
}

function loadTierInfo() {
    const tier = currentUser.tier || 'Bronze';
    const paxThisMonth = currentUser.paxThisMonth || 0;
    
    // Update tier badge
    const tierBadge = document.getElementById('tierBadge');
    tierBadge.textContent = `${tier} Tier`;
    tierBadge.className = `tier-${tier.toLowerCase()} text-white px-4 py-2 rounded-full font-semibold mr-4`;
    
    // Update tier discount
    const discount = tiers[tier].discount;
    document.getElementById('tierDiscount').textContent = `$${discount}`;
    
    // Calculate progress to next tier
    let nextTierRequirement = 0;
    let nextTierName = '';
    
    switch (tier) {
        case 'Bronze':
            nextTierRequirement = 10;
            nextTierName = 'Silver';
            break;
        case 'Silver':
            nextTierRequirement = 30;
            nextTierName = 'Gold';
            break;
        case 'Gold':
            nextTierRequirement = 50;
            nextTierName = 'Platinum';
            break;
        case 'Platinum':
            nextTierRequirement = paxThisMonth;
            nextTierName = 'Platinum (Max)';
            break;
    }
    
    const progress = tier === 'Platinum' ? 100 : Math.min((paxThisMonth / nextTierRequirement) * 100, 100);
    const progressText = tier === 'Platinum' ? 'Max Tier Achieved!' : `${paxThisMonth}/${nextTierRequirement} pax`;
    
    document.getElementById('tierProgress').textContent = progressText;
    document.getElementById('tierProgressBar').style.width = `${progress}%`;
}

function loadRecentActivity() {
    loadRecentQuotes();
    loadUpcomingDepartures();
}

function loadRecentQuotes() {
    const userQuotes = quotes
        .filter(q => q.agentId === currentUser.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3);
    
    const container = document.getElementById('recentQuotes');
    
    if (userQuotes.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No quotes yet. Create your first quote!</p>';
        return;
    }
    
    container.innerHTML = userQuotes.map(quote => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
                <p class="font-medium">${quote.clientName}</p>
                <p class="text-sm text-gray-600">${formatDate(quote.createdAt)}</p>
            </div>
            <div class="text-right">
                <span class="px-2 py-1 text-xs rounded-full ${
                    quote.status === 'sent' ? 'bg-green-100 text-green-800' :
                    quote.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                }">
                    ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </span>
            </div>
        </div>
    `).join('');
}

function loadUpcomingDepartures() {
    const userBookings = bookings
        .filter(b => b.agentId === currentUser.id && b.status === 'confirmed')
        .filter(b => new Date(b.travelDate) > new Date())
        .sort((a, b) => new Date(a.travelDate) - new Date(b.travelDate))
        .slice(0, 3);
    
    const container = document.getElementById('upcomingDepartures');
    
    if (userBookings.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No upcoming departures</p>';
        return;
    }
    
    container.innerHTML = userBookings.map(booking => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
                <p class="font-medium">${booking.clientName}</p>
                <p class="text-sm text-gray-600">${formatDate(booking.travelDate)}</p>
            </div>
            <div class="text-right">
                <p class="text-sm font-medium">${booking.pax} pax</p>
                <p class="text-xs text-gray-600">$${booking.totalPrice?.toLocaleString()}</p>
            </div>
        </div>
    `).join('');
}

function downloadReport() {
    const userQuotes = quotes.filter(q => q.agentId === currentUser.id);
    const userBookings = bookings.filter(b => b.agentId === currentUser.id);
    
    // Create CSV content
    let csvContent = 'Type,Date,Client Name,Status,Amount,Pax\n';
    
    // Add quotes
    userQuotes.forEach(quote => {
        const amount = quote.options?.reduce((sum, opt) => sum + (opt.finalPrice || 0), 0) || 0;
        csvContent += `Quote,${formatDate(quote.createdAt)},${quote.clientName},${quote.status},$${amount},${quote.pax?.total || 0}\n`;
    });
    
    // Add bookings
    userBookings.forEach(booking => {
        csvContent += `Booking,${formatDate(booking.createdAt)},${booking.clientName},${booking.status},$${booking.totalPrice || 0},${booking.pax || 0}\n`;
    });
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.classList.toggle('hidden');
}

// Close user menu when clicking outside
document.addEventListener('click', function(event) {
    const menu = document.getElementById('userMenu');
    const button = event.target.closest('button');
    
    if (!button || !button.onclick || button.onclick.toString().indexOf('toggleUserMenu') === -1) {
        menu.classList.add('hidden');
    }
});

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Auto-refresh dashboard every 5 minutes
setInterval(() => {
    if (currentUser && currentUser.status === 'approved') {
        loadStatistics();
        loadRecentActivity();
    }
}, 300000);