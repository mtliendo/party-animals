import Link from 'next/link'

export function SiteBrand() {
  return (
    <Link href='/' className='site-brand' aria-label='Auth0 welcomes AIE'>
      <span className='site-brand-auth0'>Auth0{'\u00a0'}</span>
      <span className='site-brand-rest'>welcomes AIE</span>
    </Link>
  )
}
