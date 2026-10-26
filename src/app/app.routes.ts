import { Routes } from '@angular/router';
import { ProductDetail } from './product-detail/product-detail';
import { ProductList } from './product-list/product-list';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./product-list/product-list').then((m) => m.ProductList),
    children: [
      {
        path: 'loader',
        loadComponent: () =>
          import('./loader/loader').then((m) => m.Loader),
      },
    ]
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./product-detail/product-detail').then((m) => m.ProductDetail),
  }
];
