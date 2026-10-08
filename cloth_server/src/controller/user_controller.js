import { user_model } from '../model/user_model.js'
import {allError} from '../middleware/errorhandling.js'
import jwt from 'jsonwebtoken'
export const user_register = async(req, res)=>{
    const {first_name,last_name , gender, email,password} = req.body

try{

}
catch(err){
    allError(err,res)
}
}