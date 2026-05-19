import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(6, 'Mínimo 6 caracteres')
  .regex(/[A-Z]/, 'Debe tener una mayúscula')
  .regex(/[0-9]/, 'Debe tener un número');

export const emailSchema = z.string().email('Correo inválido');

export const phoneSchema = z
  .string()
  .min(10, 'Teléfono inválido')
  .max(15, 'Teléfono inválido');

export const amountSchema = z
  .number()
  .positive('El monto debe ser positivo');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Contraseña requerida'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  age: z.number().min(18, 'Debes ser mayor de 18 años'),
  gender: z.enum(['male', 'female', 'unspecified']),
  phone: phoneSchema,
  country_code: z.string().default('+593'),
  email: emailSchema,
  password: passwordSchema,
});

export const movementSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: amountSchema,
  description: z.string().min(1, 'Descripción requerida'),
  category: z.string().min(1, 'Categoría requerida'),
  date: z.string().min(1, 'Fecha requerida'),
  is_couple: z.boolean().default(false),
});

export const debtSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  type: z.enum(['finite', 'infinite']),
  total_amount: amountSchema,
  installments_total: z.number().int().positive().optional(),
  interest_rate: z.number().min(0).max(100).default(0),
  is_couple: z.boolean().default(false),
  due_date: z.string().min(1, 'Fecha requerida'),
});

export const goalSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  category: z.enum(['savings', 'vacation', 'temple', 'other']),
  target_amount: amountSchema,
  deadline: z.string().min(1, 'Fecha límite requerida'),
  is_couple: z.boolean().default(false),
});

export const coupleCodeSchema = z.object({
  code: z
    .string()
    .length(8, 'El código debe tener 8 caracteres')
    .regex(/^[A-Z0-9]+$/, 'Solo letras mayúsculas y números'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type MovementFormData = z.infer<typeof movementSchema>;
export type DebtFormData = z.infer<typeof debtSchema>;
export type GoalFormData = z.infer<typeof goalSchema>;
export type CoupleCodeFormData = z.infer<typeof coupleCodeSchema>;
