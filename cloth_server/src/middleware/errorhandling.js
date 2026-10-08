export const allError = (err,res)=>{
    res.status(500).json({success:false,message:err.message})
}