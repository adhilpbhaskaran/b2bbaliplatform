// Admin Dashboard functionality

let currentTab = 'agents';
let filteredAgents = [];
let filteredQuotes = [];
let filteredBookings = [];

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    initializeAdmin();
    bindAdminEventListeners();
    loadDashboardStats();
    switchTab('agents');
});

function checkAdminAuth() {
    currentUser = getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('adminName').textContent = currentUser.contactPerson || 'Admin';
}

function initializeAdmin() {
    // Initialize admin-specific data if needed
    if (!localStorage.getItem('adminSettings')) {
        const adminSettings = {
            emailNotifications: true,
            autoApproval: false,
            platformCommissionRate: 0.1, // 10% platform commission
            tierUpdateFrequency: 'monthly'
        };
        localStorage.setItem('adminSettings', JSON.stringify(adminSettings));
    }
}

function bindAdminEventListeners() {
    // User menu toggle
    document.getElementById('userMenuBtn').addEventListener('click', function() {
        const menu = document.getElementById('userMenu');
        menu.classList.toggle('hidden');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        const menu = document.getElementById('userMenu');
        const button = document.getElementById('userMenuBtn');
        
        if (!button.contains(event.target) && !menu.contains(event.target)) {
            menu.classList.add('hidden');
        }
    });
}

function loadDashboardStats() {
    // Calculate total revenue
    const totalRevenue = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, booking) => sum + booking.totalAmount, 0);
    
    // Calculate active agents
    const activeAgents = agents.filter(a => a.status === 'approved').length;
    const pendingAgents = agents.filter(a => a.status === 'pending').length;
    
    // Calculate bookings
    const totalBookings = bookings.length;
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisMonthBookings = bookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate.getMonth() === thisMonth && bookingDate.getFullYear() === thisYear;
    }).length;
    
    // Calculate quotes
    const totalQuotes = quotes.length;
    const confirmedQuotes = quotes.filter(q => q.status === 'confirmed').length;
    const conversionRate = totalQuotes > 0 ? ((confirmedQuotes / totalQuotes) * 100).toFixed(1) : 0;
    
    // Update UI
    document.getElementById('totalRevenue').textContent = `$${totalRevenue.toLocaleString()}`;
    document.getElementById('activeAgents').textContent = activeAgents;
    document.getElementById('pendingAgents').textContent = `${pendingAgents} pending approval`;
    document.getElementById('totalBookings').textContent = totalBookings;
    document.getElementById('thisMonthBookings').textContent = `${thisMonthBookings} this month`;
    document.getElementById('totalQuotes').textContent = totalQuotes;
    document.getElementById('conversionRate').textContent = `${conversionRate}% conversion rate`;
    
    // Calculate growth (simplified - comparing with previous month)
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    const lastMonthRevenue = bookings
        .filter(b => {
            const bookingDate = new Date(b.createdAt);
            return bookingDate.getMonth() === lastMonth && 
                   bookingDate.getFullYear() === lastMonthYear &&
                   (b.status === 'confirmed' || b.status === 'completed');
        })
        .reduce((sum, booking) => sum + booking.totalAmount, 0);
    
    const revenueGrowth = lastMonthRevenue > 0 ? 
        (((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1) : 0;
    
    document.getElementById('revenueGrowth').textContent = `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth}% from last month`;
}

function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    });
    
    document.getElementById(`${tabName}Tab`).classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    document.getElementById(`${tabName}Tab`).classList.add('border-blue-500', 'text-blue-600');
    
    // Update content visibility
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    document.getElementById(`${tabName}Content`).classList.remove('hidden');
    
    // Load tab-specific content
    switch (tabName) {
        case 'agents':
            loadAgentsTable();
            break;
        case 'quotes':
            loadQuotesTable();
            break;
        case 'bookings':
            loadBookingsTable();
            break;
        case 'packages':
            loadPackagesGrid();
            break;
        case 'reports':
            loadReportsData();
            break;
    }
}

function loadAgentsTable() {
    filteredAgents = [...agents];
    renderAgentsTable();
}

function renderAgentsTable() {
    const tbody = document.getElementById('agentsTable');
    
    tbody.innerHTML = filteredAgents.map(agent => {
        const revenue = bookings
            .filter(b => b.agentId === agent.id && (b.status === 'confirmed' || b.status === 'completed'))
            .reduce((sum, booking) => sum + booking.totalAmount, 0);
        
        const quotesCount = quotes.filter(q => q.agentId === agent.id).length;
        
        return `
            <tr class="table-row">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <i class="fas fa-user text-gray-600"></i>
                            </div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${agent.contactPerson}</div>
                            <div class="text-sm text-gray-500">${agent.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${agent.companyName || 'Independent'}</div>
                    <div class="text-sm text-gray-500">${agent.whatsapp}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        ${agent.tier}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-${agent.status}">
                        ${agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>Revenue: $${revenue.toLocaleString()}</div>
                    <div class="text-gray-500">Quotes: ${quotesCount}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex space-x-2">
                        <button onclick="viewAgentDetails('${agent.id}')" class="text-blue-600 hover:text-blue-900">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${agent.status === 'pending' ? `
                            <button onclick="approveAgent('${agent.id}')" class="text-green-600 hover:text-green-900">
                                <i class="fas fa-check"></i>
                            </button>
                            <button onclick="rejectAgent('${agent.id}')" class="text-red-600 hover:text-red-900">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                        ${agent.status === 'approved' ? `
                            <button onclick="suspendAgent('${agent.id}')" class="text-yellow-600 hover:text-yellow-900">
                                <i class="fas fa-pause"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterAgents() {
    const statusFilter = document.getElementById('agentStatusFilter').value;
    
    filteredAgents = agents.filter(agent => {
        if (statusFilter !== 'all' && agent.status !== statusFilter) return false;
        return true;
    });
    
    renderAgentsTable();
}

function viewAgentDetails(agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    
    const agentQuotes = quotes.filter(q => q.agentId === agentId);
    const agentBookings = bookings.filter(b => b.agentId === agentId);
    const revenue = agentBookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, booking) => sum + booking.totalAmount, 0);
    
    const modalContent = document.getElementById('agentModalContent');
    modalContent.innerHTML = `
        <div class="grid md:grid-cols-2 gap-6">
            <div>
                <h4 class="font-semibold mb-3">Agent Information</h4>
                <div class="space-y-2 text-sm">
                    <p><strong>Name:</strong> ${agent.contactPerson}</p>
                    <p><strong>Email:</strong> ${agent.email}</p>
                    <p><strong>WhatsApp:</strong> ${agent.whatsapp}</p>
                    <p><strong>Company:</strong> ${agent.companyName || 'Independent'}</p>
                    <p><strong>Tier:</strong> ${agent.tier}</p>
                    <p><strong>Status:</strong> ${agent.status}</p>
                    <p><strong>Joined:</strong> ${new Date(agent.createdAt).toLocaleDateString()}</p>
                </div>
            </div>
            
            <div>
                <h4 class="font-semibold mb-3">Performance Metrics</h4>
                <div class="space-y-2 text-sm">
                    <p><strong>Total Revenue:</strong> $${revenue.toLocaleString()}</p>
                    <p><strong>Quotes Generated:</strong> ${agentQuotes.length}</p>
                    <p><strong>Bookings:</strong> ${agentBookings.length}</p>
                    <p><strong>Conversion Rate:</strong> ${agentQuotes.length > 0 ? ((agentBookings.length / agentQuotes.length) * 100).toFixed(1) : 0}%</p>
                    <p><strong>Pax This Month:</strong> ${agent.paxThisMonth || 0}</p>
                    <p><strong>Total Pax:</strong> ${agent.totalPax || 0}</p>
                </div>
            </div>
        </div>
        
        <div class="mt-6">
            <h4 class="font-semibold mb-3">Recent Activity</h4>
            <div class="max-h-40 overflow-y-auto">
                ${agentQuotes.slice(-5).map(quote => `
                    <div class="text-sm py-2 border-b">
                        <span class="font-medium">${quote.clientName}</span> - 
                        <span class="text-gray-600">${new Date(quote.createdAt).toLocaleDateString()}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="mt-6 flex justify-end space-x-3">
            ${agent.status === 'pending' ? `
                <button onclick="approveAgent('${agent.id}'); closeAgentModal();" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                    Approve Agent
                </button>
                <button onclick="rejectAgent('${agent.id}'); closeAgentModal();" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                    Reject Agent
                </button>
            ` : ''}
            <button onclick="closeAgentModal()" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">
                Close
            </button>
        </div>
    `;
    
    document.getElementById('agentModal').classList.remove('hidden');
}

function closeAgentModal() {
    document.getElementById('agentModal').classList.add('hidden');
}

function approveAgent(agentId) {
    const agentIndex = agents.findIndex(a => a.id === agentId);
    if (agentIndex >= 0) {
        agents[agentIndex].status = 'approved';
        agents[agentIndex].approvedAt = new Date().toISOString();
        saveData();
        loadAgentsTable();
        loadDashboardStats();
        alert('Agent approved successfully!');
    }
}

function rejectAgent(agentId) {
    const agentIndex = agents.findIndex(a => a.id === agentId);
    if (agentIndex >= 0) {
        agents[agentIndex].status = 'rejected';
        agents[agentIndex].rejectedAt = new Date().toISOString();
        saveData();
        loadAgentsTable();
        loadDashboardStats();
        alert('Agent rejected.');
    }
}

function suspendAgent(agentId) {
    if (confirm('Are you sure you want to suspend this agent?')) {
        const agentIndex = agents.findIndex(a => a.id === agentId);
        if (agentIndex >= 0) {
            agents[agentIndex].status = 'suspended';
            agents[agentIndex].suspendedAt = new Date().toISOString();
            saveData();
            loadAgentsTable();
            loadDashboardStats();
            alert('Agent suspended.');
        }
    }
}

function loadQuotesTable() {
    filteredQuotes = [...quotes];
    renderQuotesTable();
}

function renderQuotesTable() {
    const tbody = document.getElementById('quotesTable');
    
    tbody.innerHTML = filteredQuotes.map(quote => {
        const agent = agents.find(a => a.id === quote.agentId);
        const totalValue = quote.options ? Math.min(...quote.options.map(o => o.finalPrice || 0)) : 0;
        
        return `
            <tr class="table-row">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${quote.id.substring(0, 8)}...
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${quote.clientName}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${agent ? agent.contactPerson : 'Unknown'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${quote.package ? quote.package.name : 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    $${totalValue.toLocaleString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-${quote.status}">
                        ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="viewQuoteDetails('${quote.id}')" class="text-blue-600 hover:text-blue-900">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterQuotes() {
    const statusFilter = document.getElementById('quoteStatusFilter').value;
    const dateFilter = document.getElementById('quoteDateFilter').value;
    
    filteredQuotes = quotes.filter(quote => {
        if (statusFilter !== 'all' && quote.status !== statusFilter) return false;
        if (dateFilter && !quote.createdAt.startsWith(dateFilter)) return false;
        return true;
    });
    
    renderQuotesTable();
}

function viewQuoteDetails(quoteId) {
    // This would open a modal with quote details
    alert(`Quote details for ${quoteId} would be displayed here`);
}

function loadBookingsTable() {
    filteredBookings = [...bookings];
    renderBookingsTable();
}

function renderBookingsTable() {
    const tbody = document.getElementById('bookingsTable');
    
    tbody.innerHTML = filteredBookings.map(booking => {
        const agent = agents.find(a => a.id === booking.agentId);
        
        return `
            <tr class="table-row">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${booking.id.substring(0, 8)}...
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${booking.clientName}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${agent ? agent.contactPerson : 'Unknown'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${new Date(booking.travelDate).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    $${booking.totalAmount.toLocaleString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-${booking.status}">
                        ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="viewBookingDetails('${booking.id}')" class="text-blue-600 hover:text-blue-900">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterBookings() {
    const statusFilter = document.getElementById('bookingStatusFilter').value;
    
    filteredBookings = bookings.filter(booking => {
        if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
        return true;
    });
    
    renderBookingsTable();
}

function viewBookingDetails(bookingId) {
    // This would open a modal with booking details
    alert(`Booking details for ${bookingId} would be displayed here`);
}

function loadPackagesGrid() {
    const grid = document.getElementById('packagesGrid');
    
    grid.innerHTML = packages.map(pkg => `
        <div class="bg-white border rounded-lg p-6">
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-lg font-semibold">${pkg.name}</h3>
                <div class="flex space-x-2">
                    <button onclick="editPackage('${pkg.id}')" class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deletePackage('${pkg.id}')" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="space-y-2 mb-4">
                <p class="text-sm text-gray-600"><i class="fas fa-calendar mr-2"></i>${pkg.duration} days</p>
                <p class="text-sm text-gray-600"><i class="fas fa-map-marker-alt mr-2"></i>${pkg.locations.join(' → ')}</p>
                <p class="text-sm text-gray-600"><i class="fas fa-bed mr-2"></i>${pkg.nights.join('-')} nights</p>
            </div>
            
            <div class="mb-4">
                <h4 class="font-medium mb-2">Inclusions:</h4>
                <ul class="text-sm text-gray-600 space-y-1">
                    ${pkg.inclusions.slice(0, 3).map(inc => `<li>• ${inc}</li>`).join('')}
                    ${pkg.inclusions.length > 3 ? `<li class="text-gray-500">... and ${pkg.inclusions.length - 3} more</li>` : ''}
                </ul>
            </div>
            
            <div class="text-right">
                <p class="text-lg font-bold text-blue-600">From $${pkg.basePrice}/person</p>
            </div>
        </div>
    `).join('');
}

function addPackage() {
    alert('Add package functionality would be implemented here');
}

function editPackage(packageId) {
    alert(`Edit package ${packageId} functionality would be implemented here`);
}

function deletePackage(packageId) {
    if (confirm('Are you sure you want to delete this package?')) {
        const packageIndex = packages.findIndex(p => p.id === packageId);
        if (packageIndex >= 0) {
            packages.splice(packageIndex, 1);
            saveData();
            loadPackagesGrid();
            alert('Package deleted successfully!');
        }
    }
}

function loadReportsData() {
    // Load top agents
    const topAgents = agents
        .filter(a => a.status === 'approved')
        .map(agent => {
            const revenue = bookings
                .filter(b => b.agentId === agent.id && (b.status === 'confirmed' || b.status === 'completed'))
                .reduce((sum, booking) => sum + booking.totalAmount, 0);
            return { ...agent, revenue };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    
    document.getElementById('topAgents').innerHTML = topAgents.map((agent, index) => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div class="flex items-center">
                <span class="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                    ${index + 1}
                </span>
                <div>
                    <p class="font-medium">${agent.contactPerson}</p>
                    <p class="text-sm text-gray-600">${agent.tier} Tier</p>
                </div>
            </div>
            <div class="text-right">
                <p class="font-semibold">$${agent.revenue.toLocaleString()}</p>
                <p class="text-sm text-gray-600">${quotes.filter(q => q.agentId === agent.id).length} quotes</p>
            </div>
        </div>
    `).join('');
    
    // Load recent activity
    const recentActivity = [
        ...quotes.slice(-5).map(q => ({ type: 'quote', data: q, time: q.createdAt })),
        ...bookings.slice(-5).map(b => ({ type: 'booking', data: b, time: b.createdAt })),
        ...agents.filter(a => a.status === 'pending').slice(-3).map(a => ({ type: 'registration', data: a, time: a.createdAt }))
    ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 10);
    
    document.getElementById('recentActivity').innerHTML = recentActivity.map(activity => {
        const agent = agents.find(a => a.id === activity.data.agentId);
        let description = '';
        let icon = '';
        
        switch (activity.type) {
            case 'quote':
                description = `${agent ? agent.contactPerson : 'Unknown'} created quote for ${activity.data.clientName}`;
                icon = 'fas fa-file-invoice';
                break;
            case 'booking':
                description = `${agent ? agent.contactPerson : 'Unknown'} confirmed booking for ${activity.data.clientName}`;
                icon = 'fas fa-calendar-check';
                break;
            case 'registration':
                description = `${activity.data.contactPerson} registered as new agent`;
                icon = 'fas fa-user-plus';
                break;
        }
        
        return `
            <div class="flex items-center p-3 bg-gray-50 rounded">
                <i class="${icon} text-blue-600 mr-3"></i>
                <div class="flex-1">
                    <p class="text-sm">${description}</p>
                    <p class="text-xs text-gray-500">${new Date(activity.time).toLocaleString()}</p>
                </div>
            </div>
        `;
    }).join('');
    
    // Update quick stats
    const totalQuotes = quotes.length;
    const confirmedQuotes = quotes.filter(q => q.status === 'confirmed').length;
    const conversionRate = totalQuotes > 0 ? ((confirmedQuotes / totalQuotes) * 100).toFixed(1) : 0;
    
    const avgQuoteValue = quotes.length > 0 ? 
        (quotes.reduce((sum, q) => sum + (q.options ? Math.min(...q.options.map(o => o.finalPrice || 0)) : 0), 0) / quotes.length).toFixed(0) : 0;
    
    const avgBookingValue = bookings.length > 0 ? 
        (bookings.reduce((sum, b) => sum + b.totalAmount, 0) / bookings.length).toFixed(0) : 0;
    
    const platformCommission = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, booking) => sum + (booking.totalAmount * 0.1), 0); // 10% commission
    
    document.getElementById('adminConversionRate').textContent = `${conversionRate}%`;
    document.getElementById('avgQuoteValue').textContent = `$${avgQuoteValue}`;
    document.getElementById('avgBookingValue').textContent = `$${avgBookingValue}`;
    document.getElementById('platformCommission').textContent = `$${platformCommission.toLocaleString()}`;
}

function exportAgents() {
    const csvContent = "data:text/csv;charset=utf-8," + 
        "Name,Email,Company,Tier,Status,Revenue,Quotes,Bookings\n" +
        filteredAgents.map(agent => {
            const revenue = bookings
                .filter(b => b.agentId === agent.id && (b.status === 'confirmed' || b.status === 'completed'))
                .reduce((sum, booking) => sum + booking.totalAmount, 0);
            const quotesCount = quotes.filter(q => q.agentId === agent.id).length;
            const bookingsCount = bookings.filter(b => b.agentId === agent.id).length;
            
            return `"${agent.contactPerson}","${agent.email}","${agent.companyName || 'Independent'}","${agent.tier}","${agent.status}",${revenue},${quotesCount},${bookingsCount}`;
        }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agents_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportBookings() {
    const csvContent = "data:text/csv;charset=utf-8," + 
        "Booking ID,Client,Agent,Travel Date,Amount,Status,Created\n" +
        filteredBookings.map(booking => {
            const agent = agents.find(a => a.id === booking.agentId);
            return `"${booking.id}","${booking.clientName}","${agent ? agent.contactPerson : 'Unknown'}","${booking.travelDate}",${booking.totalAmount},"${booking.status}","${booking.createdAt}"`;
        }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Monthly automation functions
function performMonthlyReset() {
    // Reset pax_this_month for all agents
    agents.forEach(agent => {
        agent.paxThisMonth = 0;
    });
    
    // Update agent tiers based on confirmed bookings
    agents.forEach(agent => {
        const confirmedBookings = bookings.filter(b => 
            b.agentId === agent.id && 
            (b.status === 'confirmed' || b.status === 'completed')
        );
        
        const totalPax = confirmedBookings.reduce((sum, booking) => sum + booking.pax.total, 0);
        agent.totalPax = totalPax;
        
        // Update tier based on total pax
        if (totalPax >= 500) {
            agent.tier = 'Platinum';
        } else if (totalPax >= 200) {
            agent.tier = 'Gold';
        } else if (totalPax >= 50) {
            agent.tier = 'Silver';
        } else {
            agent.tier = 'Bronze';
        }
    });
    
    saveData();
    console.log('Monthly reset completed');
}

// Daily admin email summary (simulated)
function generateDailyAdminEmail() {
    const today = new Date().toISOString().split('T')[0];
    
    const newRegistrations = agents.filter(a => a.createdAt.startsWith(today));
    const upcomingDepartures = bookings.filter(b => {
        const travelDate = new Date(b.travelDate);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return travelDate.toISOString().split('T')[0] === tomorrow.toISOString().split('T')[0];
    });
    
    const topAgents = agents
        .filter(a => a.status === 'approved')
        .sort((a, b) => (b.paxThisMonth || 0) - (a.paxThisMonth || 0))
        .slice(0, 5);
    
    const emailContent = {
        subject: `Daily Admin Report - ${new Date().toLocaleDateString()}`,
        newRegistrations: newRegistrations.length,
        upcomingDepartures: upcomingDepartures.length,
        topAgents: topAgents.map(a => ({ name: a.contactPerson, pax: a.paxThisMonth || 0 }))
    };
    
    console.log('Daily admin email generated:', emailContent);
    return emailContent;
}

// Initialize monthly automation (in a real app, this would be handled by a cron job)
if (typeof window !== 'undefined') {
    // Check if it's a new month and perform reset if needed
    const lastReset = localStorage.getItem('lastMonthlyReset');
    const currentMonth = new Date().getMonth();
    
    if (!lastReset || new Date(lastReset).getMonth() !== currentMonth) {
        performMonthlyReset();
        localStorage.setItem('lastMonthlyReset', new Date().toISOString());
    }
    
    // Generate daily email (in a real app, this would be scheduled)
    generateDailyAdminEmail();
}