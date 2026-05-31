import React from 'react';
import { Button } from './Button';

export default {
  title: 'UI/Button',
  component: Button,
};

export const Primary = () => <Button variant="primary">Cobrar</Button>;
export const Secondary = () => <Button variant="secondary">Cancelar</Button>;
export const Danger = () => <Button variant="danger">Eliminar</Button>;
export const Success = () => <Button variant="success">Guardar</Button>;
export const Ghost = () => <Button variant="ghost">Ver más</Button>;
export const Loading = () => <Button isLoading>Procesando</Button>;
export const FullWidth = () => <Button fullWidth>Pagar</Button>;
