import React, { useState, useMemo } from 'react';
import styles from './CoordinatorAMSDashboard.module.css';
import adminDashboardStyles from '../../dashboard/CoordinatorAdminDashboard.module.css';
import statusCardStyles from '../../dashboard/CoordinatorAdminDashboardStatusCards.module.css';
import ticketStyles from '../../ticket-management/CoordinatorAdminTicketManagement.module.css';
import TablePagination from '../../../../shared/table/TablePagination';
import FilterPanel from '../../../../shared/table/FilterPanel';
import Tabs from '../../../../shared/components/Tabs';
import InputField from '../../../../shared/components/InputField';

const CoordinatorAMSDashboard = () => {
	const [searchTerm, setSearchTerm] = useState('');
	const [activeFilter, setActiveFilter] = useState('All');
	const [showFilter, setShowFilter] = useState(true);
	const [activeFilters, setActiveFilters] = useState({});
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	const assets = useMemo(
		() => [
			{ id: 'AST-001', name: 'Dell Latitude 5420', productType: 'Laptop', quantity: 15, location: 'Warehouse A', status: 'Available' },
			{ id: 'AST-002', name: 'HP EliteBook 840', productType: 'Laptop', quantity: 0, location: 'Warehouse A', status: 'Out of Stock' },
			{ id: 'AST-003', name: 'Lenovo ThinkPad X1', productType: 'Laptop', quantity: 8, location: 'Warehouse B', status: 'Available' },
			{ id: 'AST-004', name: 'MacBook Pro 14"', productType: 'Laptop', quantity: 12, location: 'Warehouse A', status: 'Available' },
			{ id: 'AST-005', name: 'Dell UltraSharp Monitor', productType: 'Monitor', quantity: 0, location: 'Warehouse C', status: 'Out of Stock' },
			{ id: 'AST-006', name: 'Logitech Keyboard', productType: 'Accessory', quantity: 25, location: 'Warehouse B', status: 'Available' },
			{ id: 'AST-007', name: 'HP Docking Station', productType: 'Accessory', quantity: 10, location: 'Warehouse A', status: 'Available' },
			{ id: 'AST-008', name: 'Microsoft Surface Pro', productType: 'Tablet', quantity: 0, location: 'Warehouse C', status: 'Out of Stock' },
			{ id: 'AST-009', name: 'Samsung 27" Monitor', productType: 'Monitor', quantity: 18, location: 'Warehouse B', status: 'Available' },
			{ id: 'AST-010', name: 'Cisco IP Phone', productType: 'Phone', quantity: 7, location: 'Warehouse A', status: 'Available' },
			{ id: 'AST-011', name: 'Jabra Headset', productType: 'Accessory', quantity: 0, location: 'Warehouse B', status: 'Out of Stock' },
			{ id: 'AST-012', name: 'APC UPS Battery', productType: 'Power', quantity: 20, location: 'Warehouse C', status: 'Available' },
		],
		[]
	);

	const stats = useMemo(() => ({
		total: assets.length,
		available: assets.filter((a) => a.status === 'Available').length,
		outOfStock: assets.filter((a) => a.status === 'Out of Stock').length,
	}), [assets]);

	const filtered = useMemo(() => {
		const term = (searchTerm || '').trim().toLowerCase();
		return assets.filter((a) => {
			const matchesSearch = !term || a.name.toLowerCase().includes(term) || a.productType.toLowerCase().includes(term) || a.id.toLowerCase().includes(term);
			const matchesTabFilter = activeFilter === 'All' || a.status === activeFilter;

			let matchesActiveFilters = true;
			if (activeFilters) {
				if (activeFilters.status && activeFilters.status.label) {
					matchesActiveFilters = matchesActiveFilters && (String(a.status).toLowerCase() === String(activeFilters.status.label).toLowerCase());
				}
				if (activeFilters.category && activeFilters.category.label) {
					const cat = String(activeFilters.category.label).toLowerCase();
					matchesActiveFilters = matchesActiveFilters && (a.productType && String(a.productType).toLowerCase().includes(cat));
				}
				if (activeFilters.subCategory && activeFilters.subCategory.label) {
					const sub = String(activeFilters.subCategory.label).toLowerCase();
					matchesActiveFilters = matchesActiveFilters && (a.productType && String(a.productType).toLowerCase().includes(sub));
				}
			}

			return matchesSearch && matchesTabFilter && matchesActiveFilters;
		});
	}, [assets, searchTerm, activeFilter, activeFilters]);

	const paginated = useMemo(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filtered.slice(start, start + itemsPerPage);
	}, [filtered, currentPage, itemsPerPage]);

	return (
		<div className={ticketStyles.pageContainer}>
			<h1 className={adminDashboardStyles.title}>AMS — Inventory</h1>

			{/* Status Cards Section */}
			<section className={adminDashboardStyles.statusCardsGrid}>
				<div className={`${statusCardStyles.statusCard} ${styles.totalCard}`} onClick={() => { setActiveFilter('All'); setCurrentPage(1); }}>
					<div className={statusCardStyles.statCardContent}>
						<div className={`${statusCardStyles.statBadge} ${statusCardStyles.statBadgeBlue}`}>{stats.total}</div>
						<div>
							<div className={statusCardStyles.statLabel}>Total Items</div>
						</div>
					</div>
				</div>

				<div className={`${statusCardStyles.statusCard} ${styles.availableCard}`} onClick={() => { setActiveFilter('Available'); setCurrentPage(1); }}>
					<div className={statusCardStyles.statCardContent}>
						<div className={`${statusCardStyles.statBadge} ${statusCardStyles.statBadgeOpen}`}>{stats.available}</div>
						<div>
							<div className={statusCardStyles.statLabel}>Available</div>
						</div>
					</div>
				</div>

				<div className={`${statusCardStyles.statusCard} ${styles.outOfStockCard}`} onClick={() => { setActiveFilter('Out of Stock'); setCurrentPage(1); }}>
					<div className={statusCardStyles.statCardContent}>
						<div className={`${statusCardStyles.statBadge} ${statusCardStyles.statBadgeRed}`}>{stats.outOfStock}</div>
						<div>
							<div className={statusCardStyles.statLabel}>Out of Stock</div>
						</div>
					</div>
				</div>
			</section>

			{/* Tabs Row */}
			<div className={styles.tabsRow}>
				<Tabs
					tabs={[{ label: 'All', value: 'All' }, { label: 'Available', value: 'Available' }, { label: 'Out of Stock', value: 'Out of Stock' }]}
					active={activeFilter}
					onChange={(v) => { setActiveFilter(v); setCurrentPage(1); }}
				/>
			</div>

			{/* Top bar with Show Filter button */}
			<div className={ticketStyles.topBar}>
				<button 
					className={ticketStyles.showFilterButton}
					onClick={() => setShowFilter(!showFilter)}
				>
					{showFilter ? 'Hide Filter' : 'Show Filter'}
				</button>
			</div>

			{/* Filter Panel - above table section */}
			{showFilter && (
				<FilterPanel
					preset="assetManagement"
					fields={['status','priority','category','subCategory','slaStatus','startDate','endDate']}
					onApply={(f) => { setActiveFilters(f); setCurrentPage(1); }}
					onReset={() => { setActiveFilters({}); setCurrentPage(1); }}
					initialFilters={activeFilters}
					hideToggleButton={true}
				/>
			)}

			{/* Table Section */}
			<div className={ticketStyles.tableSection}>
				<div className={ticketStyles.tableHeader}>
					<h2>Assets</h2>
					<div className={ticketStyles.tableActions}>
						<InputField
							placeholder="Search assets..."
							value={searchTerm}
							onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
							inputStyle={{ width: '260px' }}
						/>
					</div>
				</div>
				
				<div className={ticketStyles.tableWrapper}>
					<table className={ticketStyles.table}>
						<thead>
							<tr>
								<th>ASSET NAME</th>
								<th>PRODUCT TYPE</th>
								<th>STATUS</th>
								<th>LOCATION</th>
							</tr>
						</thead>
						<tbody>
							{paginated.map((a) => (
								<tr key={a.id}>
									<td>{a.name}</td>
									<td><span className={styles.productTypeBadge}>{a.productType}</span></td>
									<td><span className={`${styles.statusBadge} ${a.status === 'Available' ? styles.statusAvailable : styles.statusOutOfStock}`}>{a.status}</span></td>
									<td className={styles.location}>{a.location}</td>
								</tr>
							))}
						</tbody>
					</table>
					{filtered.length === 0 && <div className={styles.emptyState}>No assets match your criteria.</div>}
					<div className={ticketStyles.tablePagination}>
						<TablePagination
							currentPage={currentPage}
							totalItems={filtered.length}
							initialItemsPerPage={itemsPerPage}
							onPageChange={(p) => setCurrentPage(p)}
							onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
							alwaysShow={true}
						/>
					</div>
				</div>
			</div>
		</div>
	);

};

export default CoordinatorAMSDashboard;
