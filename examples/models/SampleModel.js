/**
 * SampleModel - Reusable model for demonstrating formatters and data operations
 */

import Model from '../../src/core/Model.js';

export default class SampleModel extends Model {
    constructor(data = {}) {
        super({
            // Personal info
            name: 'John Doe',
            firstName: 'John',
            lastName: 'Doe',
            email: 'JOHN.DOE@EXAMPLE.COM',
            phone: '5551234567',
            username: 'johndoe',
            
            // Dates
            joinDate: new Date('2024-01-15'),
            lastActive: new Date(Date.now() - 3600000), // 1 hour ago
            birthDate: new Date('1990-05-15'),
            
            // Financial
            balance: 1234.56,
            revenue: 2456789.50,
            price: 99.99,
            discount: 0.15,
            
            // Metrics
            score: 0.875,
            completion: 0.65,
            uptime: 0.9987,
            
            // Counts
            views: 1234567,
            downloads: 42789,
            fileSize: 1048576,
            
            // Status fields
            status: 'active',
            priority: 'high',
            role: 'admin',
            
            // Text
            bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            description: 'A sample model for testing and demonstration purposes',
            
            // Boolean
            isActive: true,
            isVerified: false,
            hasNotifications: true,
            
            ...data
        });
    }
    
    // Computed properties
    get fullName() {
        return `${this.get('firstName')} ${this.get('lastName')}`;
    }
    
    get age() {
        const birthDate = this.get('birthDate');
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
    
    get accountAge() {
        const joinDate = this.get('joinDate');
        const today = new Date();
        const diffTime = Math.abs(today - joinDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
}