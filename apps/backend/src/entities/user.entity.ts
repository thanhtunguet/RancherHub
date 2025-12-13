import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  username: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ type: 'text' })
  password: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'text', nullable: true })
  twoFactorSecret: string | null;

  @Column({ default: true })
  active: boolean;

  @Column({ default: false })
  isFirstLogin: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
